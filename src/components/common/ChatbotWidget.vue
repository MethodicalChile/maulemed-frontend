<script setup>
import { ref, nextTick, watch } from 'vue'
import { X, Send } from 'lucide-vue-next'
import { GoogleGenAI } from '@google/genai'

const isOpen = ref(false)
const isThinking = ref(false)
const messages = ref([{ text: '¡Hola! ¿En qué puedo ayudarte?', sender: 'bot' }])
const newMessage = ref('')
const messagesContainer = ref(null)

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY_GEMINI })

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
    const history = messages.value.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }))
    
    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: history,
      config: {
        systemInstruction: "Eres un asistente virtual amable y profesional de MauleMed. Tu objetivo es ayudar a los usuarios con consultas sobre la plataforma, procesos internos y dudas generales de manera clara y concisa. Responde siempre en español."
      }
    })
    
    const botResponse = result.text || 'No pude obtener una respuesta'
    messages.value.push({ text: botResponse, sender: 'bot' })
  } catch (error) {
    console.error('Error:', error)
    messages.value.push({ text: `Error: ${error.message}`, sender: 'bot' })
  } finally {
    isThinking.value = false
  }
}
</script>

<template>
  <div>
    <!-- Botón flotante que es el logo -->
    <img
      src="/logo-ia.png"
      alt="Chatbot"
      @click="toggleChat"
      class="fixed bottom-6 right-6 z-50 w-36 h-36 hover:scale-110 transition-transform cursor-pointer object-contain drop-shadow-xl"
      style="image-rendering: -webkit-optimize-contrast; clip-path: circle(45%);"
    />

    <!-- Ventana de chat -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 scale-95 translate-y-4"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 translate-y-4"
    >
      <div v-if="isOpen" class="fixed bottom-24 right-6 z-50 w-80 h-96 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div class="flex items-center justify-between p-4 bg-primary text-primary-foreground">
          <span class="font-bold">Asistente MauleMed</span>
          <button @click="toggleChat" class="hover:bg-primary/20 p-1 rounded"><X :size="18" /></button>
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
