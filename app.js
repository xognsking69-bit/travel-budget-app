const AUTH_SERVER = "https://tripggu-auth.xognsking69.workers.dev";

function getDeviceId() {
  let id = localStorage.getItem("tripggu_device_id");

  if (!id) {
    id = crypto.randomUUID
      ? crypto.randomUUID()
      : "dev_" + Date.now() + "_" + Math.random().toString(36).slice(2);

    localStorage.setItem("tripggu_device_id", id);
  }

  return id;
}

async function verifyCode() {
  const codeInput = document.getElementById("code");
  const msg = document.getElementById("msg");
  const button = document.getElementById("verify");

  const code = String(codeInput?.value || "").trim().toUpperCase();

  if (!code) {
    msg.textContent = "이용코드를 입력해 주세요.";
    return;
  }

  button.disabled = true;
  msg.textContent = "구매 정보를 확인하고 있습니다...";

  try {
    const response = await fetch(AUTH_SERVER + "/verify", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        code,
        deviceId: getDeviceId()
      })
    });

    const data = await response.json();

    if (data.ok) {
      localStorage.setItem("tripggu_license_code", code);
      localStorage.setItem("tripggu_verified", "1");
      msg.textContent = "✅ 구매 인증이 완료되었습니다. Trip꾸를 여는 중...";
      msg.style.color = "#087f5b";

      setTimeout(() => {
        location.href = "./planner.html";
      }, 500);
    } else if (data.error === "DEVICE_LIMIT") {
      msg.textContent = "등록 가능한 기기 수를 초과했습니다. 판매자에게 문의해 주세요.";
      msg.style.color = "#b42318";
    } else if (data.error === "BLOCKED") {
      msg.textContent = "현재 사용할 수 없는 이용코드입니다.";
      msg.style.color = "#b42318";
    } else {
      msg.textContent = "유효하지 않은 이용코드입니다.";
      msg.style.color = "#b42318";
    }
  } catch (error) {
    console.error(error);
    msg.textContent = "인증 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    msg.style.color = "#b42318";
  } finally {
    button.disabled = false;
  }
}

document.getElementById("verify")?.addEventListener("click", verifyCode);
document.getElementById("code")?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") verifyCode();
});

// 이미 인증된 기기라면 바로 플래너로 이동
if (
  localStorage.getItem("tripggu_verified") === "1" &&
  localStorage.getItem("tripggu_license_code") &&
  localStorage.getItem("tripggu_device_id")
) {
  location.href = "./planner.html";
}
