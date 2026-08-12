import { ref } from 'vue'

const refreshFunction = ref(null)

export function useRefresh() {
  function setRefreshFunction(fn) {
    refreshFunction.value = fn
  }

  function clearRefreshFunction() {
    refreshFunction.value = null
  }

  return {
    refreshFunction,
    setRefreshFunction,
    clearRefreshFunction
  }
}
