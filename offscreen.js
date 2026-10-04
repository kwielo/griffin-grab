const textEl = document.querySelector("#text");

const colorScheme = () => matchMedia("(prefers-color-scheme: dark)");

const copy = async (text) => {
  textEl.value = text;
  textEl.select();
  if (document.execCommand("copy")) return;
  await navigator.clipboard.writeText(text);
};

colorScheme().addEventListener("change", () => {
  chrome.runtime
    .sendMessage({
      target: "background",
      type: "color-scheme",
      dark: colorScheme().matches,
    })
    .catch(() => {});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen") return;

  if (message.type === "color-scheme") {
    sendResponse({ ok: true, dark: colorScheme().matches });
    return;
  }

  if (message.type !== "copy") return;

  copy(String(message.text ?? ""))
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      sendResponse({
        ok: false,
        error: Error.isError(error) ? error.message : String(error),
      });
    });

  return true;
});
