const textEl = document.querySelector("#text");

const copy = async (text) => {
  textEl.value = text;
  textEl.select();
  if (document.execCommand("copy")) return;
  await navigator.clipboard.writeText(text);
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen" || message?.type !== "copy") return;

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
