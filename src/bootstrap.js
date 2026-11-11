let failureShown = false;
function reportBootFailure(error) {
  if (failureShown) return;
  failureShown = true;
  const root = document.getElementById("app");
  const screen = document.createElement("section");
  screen.setAttribute("role", "alert");
  screen.style.cssText =
    "position:fixed;inset:0;z-index:1000;background:#202020;color:#ddd;padding:32px;font:14px/1.8 system-ui;overflow:auto";
  const title = document.createElement("h1");
  title.textContent = "アプリを起動できませんでした";
  title.style.fontSize = "20px";
  const note = document.createElement("p");
  note.textContent =
    "再読み込みをお試しください。解決しない場合は、下のエラー内容をお知らせください。保存済みのデータは削除していません。";
  const details = document.createElement("pre");
  details.textContent = String(
    error?.stack || error?.message || error || "不明な起動エラー",
  );
  details.style.cssText =
    "white-space:pre-wrap;overflow-wrap:anywhere;background:#292929;padding:16px";
  const reload = document.createElement("button");
  reload.textContent = "再読み込み";
  reload.onclick = () => location.reload();
  const backup = document.createElement("button");
  backup.textContent = "保存データを書き出す";
  backup.style.marginLeft = "12px";
  backup.onclick = () => {
    try {
      const data = localStorage.getItem("plot-project-v1");
      if (!data) {
        note.textContent = "このブラウザーに保存されたデータはありません。";
        return;
      }
      const url = URL.createObjectURL(
          new Blob([data], { type: "application/json" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "recovery.plot.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      details.textContent += "\n" + e.message;
    }
  };
  screen.append(title, note, reload, backup, details);
  (root || document.body).append(screen);
}
window.addEventListener("error", (e) => {
  if (!document.querySelector(".cell-grid,.studio-workspace"))
    reportBootFailure(e.error || new Error(e.message));
});
import("__APP_ENTRY__")
  .then(() => document.getElementById("boot-status")?.remove())
  .catch(reportBootFailure);
