<script setup>
import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { X, Send, RotateCcw, MessageSquareText } from 'lucide-vue-next'
import http from '@/api/http'

const isOpen = ref(false)
const isThinking = ref(false)
const messages = ref([{ text: '¡Hola! ¿En qué puedo ayudarte?', sender: 'bot' }])
const chatHistory = ref([])
const newMessage = ref('')
const messagesContainer = ref(null)
const windowWidth = ref(window.innerWidth)
const windowHeight = ref(window.innerHeight)

// Variables para arrastre
const chatbotRef = ref(null)
const isDragging = ref(false)
const position = ref({ x: 24, y: 24 }) // Distancia desde abajo y derecha
const startPos = ref({ x: 0, y: 0 })
const initialPos = ref({ x: 0, y: 0 })

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

function handleResize() {
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
}

// Lógica de arrastre
function startDrag(event) {
  isDragging.value = true
  startPos.value = { x: event.clientX, y: event.clientY }
  initialPos.value = { x: position.value.x, y: position.value.y }
  
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
}

function onDrag(event) {
  if (!isDragging.value) return
  
  // Calcular la nueva posición proyectada
  let newX = initialPos.value.x - (event.clientX - startPos.value.x)
  let newY = initialPos.value.y - (event.clientY - startPos.value.y)
  
  // Limitar dentro de los bordes de la pantalla (considerando el tamaño del botón 80px)
  // X: 0 es el borde derecho, windowWidth - 80 es el borde izquierdo
  const maxX = windowWidth.value - 80
  const maxY = windowHeight.value - 80
  
  newX = Math.max(0, Math.min(newX, maxX))
  newY = Math.max(0, Math.min(newY, maxY))
  
  position.value.x = newX
  position.value.y = newY
}

function stopDrag() {
  isDragging.value = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
}

function resetChat() {
  messages.value = [{ text: '¡Hola! ¿En qué puedo ayudarte?', sender: 'bot' }]
  chatHistory.value = []
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Escuchar cambios tanto en mensajes como en isThinking
watch([messages, isThinking], scrollToBottom, { deep: true })

function toggleChat() {
  if (isDragging.value) return // No abrir si estábamos arrastrando
  isOpen.value = !isOpen.value
  if (isOpen.value) scrollToBottom()
}

async function sendMessage() {
  if (!newMessage.value.trim()) return
  
  const userMessage = newMessage.value;
  messages.value.push({ text: userMessage, sender: 'user' })
  newMessage.value = ''
  isThinking.value = true
  
  try {
    const response = await http.post('/chat/', {
      message: userMessage,
      history: chatHistory.value
    })
    
    const botResponse = response.data.response || 'No pude obtener una respuesta'
    chatHistory.value = response.data.history
    messages.value.push({ text: botResponse, sender: 'bot' })
  } catch (error) {
    console.error('Error:', error)
    messages.value.push({ text: `Error: ${error.message || 'Error de conexión'}`, sender: 'bot' })
  } finally {
    isThinking.value = false
  }
}
</script>

<template>
  <div ref="chatbotRef">
    <!-- Botón flotante con ícono de chat -->
    <div
      @click="toggleChat"
      @mousedown="startDrag"
      class="fixed z-50 w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform cursor-grab active:cursor-grabbing shadow-xl"
      :style="{ 
        bottom: position.y + 'px', 
        right: position.x + 'px'
      }"
    >
      <MessageSquareText :size="40" />
    </div>

    <!-- Ventana de chat -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 scale-95 translate-y-4"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 translate-y-4"
    >
      <div v-if="isOpen" class="fixed z-50 w-80 h-96 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        :style="{
          // Forzar despliegue hacia arriba y hacia la izquierda del botón
          bottom: (position.y + 100) + 'px',
          right: (position.x) + 'px',
          top: 'auto',
          left: 'auto',
        }"

      >
        <div class="flex items-center justify-between p-4 bg-primary text-primary-foreground">
          <span class="font-bold">Asistente MauleMed</span>
          <div class="flex items-center gap-1">
            <button @click="resetChat" class="hover:bg-primary/20 p-1 rounded" title="Limpiar chat"><RotateCcw :size="18" /></button>
            <button @click="toggleChat" class="hover:bg-primary/20 p-1 rounded"><X :size="18" /></button>
          </div>
        </div>
        
        <div ref="messagesContainer" class="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/20">
          <div v-for="(msg, idx) in messages" :key="idx" :class="['p-3 rounded-lg text-sm max-w-[80%]', msg.sender === 'user' ? 'bg-primary text-primary-foreground self-end ml-auto' : 'bg-muted text-foreground self-start']">
            {{ msg.text }}
          </div>
          <div v-if="isThinking" class="p-3 rounded-lg text-sm bg-muted text-foreground self-start">
            Pensando...
          </div>
        </div>

        <form @submit.prevent="sendMessage" class="p-3 border-t border-border flex gap-2 bg-card">
          <input v-model="newMessage" type="text" placeholder="Escribe tu mensaje..." class="flex-1 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <button type="submit" class="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"><Send :size="16" /></button>
        </form>
      </div>
    </Transition>
  </div>
</template>
