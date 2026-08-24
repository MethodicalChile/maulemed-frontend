import { ref } from "vue";

export function useTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = ref(savedTheme === "dark" || (!savedTheme && prefersDark));

  const applyTheme = () => {
    if (isDark.value) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Asegurar que el estado inicial se aplique
  applyTheme();

  const toggleTheme = () => {
    isDark.value = !isDark.value;
    applyTheme();
  };

  return { isDark, toggleTheme };
}
