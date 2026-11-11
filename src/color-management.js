export function inspectICC(bytes) {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.length < 128 ||
    bytes.length > 16 * 1024 * 1024
  )
    throw Error("ICCプロファイルは128B〜16MBで指定してください。");
  const ascii = (start, end) =>
    new TextDecoder("ascii").decode(bytes.subarray(start, end));
  if (ascii(36, 40) !== "acsp")
    throw Error("ICCプロファイルの署名が不正です。");
  const declared = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getUint32(0);
  if (declared < 128 || declared > bytes.length)
    throw Error("ICCプロファイルのサイズが不正です。");
  const space = ascii(16, 20).trim();
  if (!["RGB", "CMYK", "GRAY"].includes(space))
    throw Error("RGB・CMYK・GRAYのICCプロファイルを指定してください。");
  return {
    space,
    channels: space === "CMYK" ? 4 : space === "GRAY" ? 1 : 3,
    bytes: bytes.subarray(0, declared),
  };
}
export async function colorTransform(bytes, providedModule) {
  const profile = inspectICC(bytes);
  const url = "/color/lcms.js",
    module = providedModule || (await import(url)),
    cms = await module.instantiate({ locateFile: () => "/color/lcms.wasm" }),
    input = cms.cmsCreate_sRGBProfile(),
    output = cms.cmsOpenProfileFromMem(profile.bytes, profile.bytes.length);
  if (!output) {
    cms.cmsCloseProfile(input);
    throw Error("ICCプロファイルを開けません。");
  }
  const format =
    profile.channels === 4
      ? module.TYPE_CMYK_8
      : profile.channels === 1
        ? module.TYPE_GRAY_8
        : module.TYPE_RGB_8;
  const transform = cms.cmsCreateTransform(
    input,
    module.TYPE_RGB_8,
    output,
    format,
    module.INTENT_RELATIVE_COLORIMETRIC,
    module.cmsFLAGS_BLACKPOINTCOMPENSATION,
  );
  if (!transform) {
    cms.cmsCloseProfile(input);
    cms.cmsCloseProfile(output);
    throw Error("このICCプロファイルへの色変換を作成できません。");
  }
  const cache = new Map();
  return {
    ...profile,
    convert(rgb) {
      const key = rgb.join(",");
      if (!cache.has(key))
        cache.set(
          key,
          [...cms.cmsDoTransform(transform, new Uint8Array(rgb), 1)].map(
            (v) => v / 255,
          ),
        );
      return cache.get(key);
    },
    close() {
      cms.cmsDeleteTransform(transform);
      cms.cmsCloseProfile(input);
      cms.cmsCloseProfile(output);
    },
  };
}
function rgbFromArgs(args) {
  if (args.length >= 4) return null;
  if (
    args.length === 1 &&
    typeof args[0] === "string" &&
    args[0].startsWith("#")
  ) {
    let hex = args[0].slice(1);
    if (hex.length === 3) hex = [...hex].map((c) => c + c).join("");
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }
  const values = args
    .slice(0, 3)
    .map((v) =>
      Math.round(typeof v === "string" ? Number(v) * 255 : Number(v)),
    );
  return values.length === 1 ? [values[0], values[0], values[0]] : values;
}
export function applyPDFColor(pdf, transform) {
  for (const name of ["setFillColor", "setDrawColor", "setTextColor"]) {
    const original = pdf[name];
    pdf[name] = function (...args) {
      const rgb = rgbFromArgs(args);
      if (!rgb || rgb.some((v) => !Number.isFinite(v)))
        return original.apply(this, args);
      const converted = transform
        ? transform.convert(rgb)
        : (() => {
            const v = rgb.map((n) => n / 255),
              k = 1 - Math.max(...v);
            return k >= 1
              ? [0, 0, 0, 1]
              : [
                  (1 - v[0] - k) / (1 - k),
                  (1 - v[1] - k) / (1 - k),
                  (1 - v[2] - k) / (1 - k),
                  k,
                ];
          })();
      return original.apply(
        this,
        converted.map((v) => Math.max(0, Math.min(1, v)).toFixed(6)),
      );
    };
  }
  if (!transform) return;
  let intent;
  pdf.internal.events.subscribe("postPutResources", () => {
    const id = pdf.internal.newObject(),
      bytes = transform.bytes;
    let data = "";
    for (let i = 0; i < bytes.length; i += 8192)
      data += String.fromCharCode(...bytes.subarray(i, i + 8192));
    pdf.internal.putStream({
      data,
      additionalKeyValues: [
        { key: "N", value: transform.channels },
        {
          key: "Alternate",
          value:
            transform.channels === 4
              ? "/DeviceCMYK"
              : transform.channels === 1
                ? "/DeviceGray"
                : "/DeviceRGB",
        },
      ],
    });
    pdf.internal.out("endobj");
    intent = pdf.internal.newObject();
    pdf.internal.out(
      `<< /Type /OutputIntent /S /GTS_PDFX /OutputConditionIdentifier (Custom ICC) /DestOutputProfile ${id} 0 R >>`,
    );
    pdf.internal.out("endobj");
  });
  pdf.internal.events.subscribe("putCatalog", () => {
    pdf.internal.out(`/OutputIntents [${intent} 0 R]`);
  });
}
