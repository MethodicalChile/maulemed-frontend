import { ref, onMounted, onUnmounted } from "vue";

export function useSessionTimeout(
  onTimeout,
  timeout = 5 * 60 * 1000,
  warningTimeout = 30 * 1000,
) {
  const showWarning = ref(false);
  const remainingTime = ref(0);

  const updateLastActivity = (force = false) => {
    if (!force && showWarning.value) return;
    sessionStorage.setItem("lastActivity", Date.now().toString());
    if (force) {
      showWarning.value = false;
    }
  };

  const handleActivity = () => {
    if (showWarning.value) return;
    updateLastActivity();
  };

  const refreshSession = () => {
    updateLastActivity(true);
    showWarning.value = false;
  };

  let interval;

  onMounted(() => {
    updateLastActivity(true);
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity);

    interval = setInterval(() => {
      const lastActivity = parseInt(
        sessionStorage.getItem("lastActivity") || "0",
        10,
      );
      const timeSinceLastActivity = Date.now() - lastActivity;

      if (timeSinceLastActivity > timeout) {
        showWarning.value = false;
        onTimeout();
      } else if (timeSinceLastActivity > timeout - warningTimeout) {
        showWarning.value = true;
        remainingTime.value = Math.ceil(
          (timeout - timeSinceLastActivity) / 1000,
        );
      } else {
        showWarning.value = false;
      }
    }, 1000);
  });

  onUnmounted(() => {
    window.removeEventListener("mousemove", handleActivity);
    window.removeEventListener("keydown", handleActivity);
    window.removeEventListener("scroll", handleActivity);
    clearInterval(interval);
  });

  return { showWarning, remainingTime, refreshSession };
}
