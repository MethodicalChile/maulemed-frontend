<script setup>
import {
  ref,
  nextTick,
  watch,
  onMounted,
  onUnmounted,
} from "vue";

import {
  X,
  Send,
  RotateCcw,
  MessageSquareText,
} from "lucide-vue-next";

import http from "@/api/http";


const isOpen = ref(false);
const isThinking = ref(false);

const messages = ref([
  {
    text: "¡Hola! ¿En qué puedo ayudarte?",
    sender: "bot",
  },
]);

const chatHistory = ref([]);
const newMessage = ref("");

const messagesContainer = ref(null);

const windowWidth = ref(
  window.innerWidth
);

const windowHeight = ref(
  window.innerHeight
);


// =========================================================
// ARRASTRE
// =========================================================

const chatbotRef = ref(null);

const isDragging = ref(false);

const position = ref({
  x: 24,
  y: 24,
});

const startPos = ref({
  x: 0,
  y: 0,
});

const initialPos = ref({
  x: 0,
  y: 0,
});


onMounted(() => {
  window.addEventListener(
    "resize",
    handleResize,
  );
});


onUnmounted(() => {
  window.removeEventListener(
    "resize",
    handleResize,
  );

  window.removeEventListener(
    "mousemove",
    onDrag,
  );

  window.removeEventListener(
    "mouseup",
    stopDrag,
  );
});


function handleResize() {
  windowWidth.value =
    window.innerWidth;

  windowHeight.value =
    window.innerHeight;
}


// =========================================================
// DRAG
// =========================================================

function startDrag(event) {
  /*
   * Solo iniciar drag con botón izquierdo.
   */
  if (event.button !== 0) {
    return;
  }

  isDragging.value = false;

  startPos.value = {
    x: event.clientX,
    y: event.clientY,
  };

  initialPos.value = {
    x: position.value.x,
    y: position.value.y,
  };

  window.addEventListener(
    "mousemove",
    onDrag,
  );

  window.addEventListener(
    "mouseup",
    stopDrag,
  );
}


function onDrag(event) {
  const deltaX =
    event.clientX -
    startPos.value.x;

  const deltaY =
    event.clientY -
    startPos.value.y;

  /*
   * Consideramos drag solamente cuando
   * realmente hubo movimiento.
   *
   * Esto evita confundir click con arrastre.
   */
  if (
    Math.abs(deltaX) > 3 ||
    Math.abs(deltaY) > 3
  ) {
    isDragging.value = true;
  }

  if (!isDragging.value) {
    return;
  }

  let newX =
    initialPos.value.x -
    deltaX;

  let newY =
    initialPos.value.y -
    deltaY;

  const maxX =
    windowWidth.value - 80;

  const maxY =
    windowHeight.value - 80;

  newX = Math.max(
    0,
    Math.min(
      newX,
      maxX,
    ),
  );

  newY = Math.max(
    0,
    Math.min(
      newY,
      maxY,
    ),
  );

  position.value.x = newX;
  position.value.y = newY;
}


function stopDrag() {
  window.removeEventListener(
    "mousemove",
    onDrag,
  );

  window.removeEventListener(
    "mouseup",
    stopDrag,
  );

  /*
   * Dejamos un pequeño ciclo antes
   * de restaurar el estado.
   */
  setTimeout(() => {
    isDragging.value = false;
  }, 0);
}


// =========================================================
// CHAT
// =========================================================

function resetChat(event = null) {
  event?.preventDefault();
  event?.stopPropagation();

  messages.value = [
    {
      text:
        "¡Hola! ¿En qué puedo ayudarte?",
      sender: "bot",
    },
  ];

  chatHistory.value = [];
  newMessage.value = "";
}


function scrollToBottom() {
  nextTick(() => {
    if (
      messagesContainer.value
    ) {
      messagesContainer.value.scrollTop =
        messagesContainer.value
          .scrollHeight;
    }
  });
}


watch(
  [
    messages,
    isThinking,
  ],
  scrollToBottom,
  {
    deep: true,
  },
);


function toggleChat(
  event = null,
) {
  event?.preventDefault();
  event?.stopPropagation();

  if (isDragging.value) {
    return;
  }

  isOpen.value =
    !isOpen.value;

  if (isOpen.value) {
    scrollToBottom();
  }
}


// =========================================================
// ENVÍO DE MENSAJES
// =========================================================

async function sendMessage(event = null) {
  event?.preventDefault();
  event?.stopPropagation();

  if (isThinking.value) {
    return;
  }

  const userMessage =
    newMessage.value.trim();

  if (!userMessage) {
    return;
  }

  messages.value.push({
    text: userMessage,
    sender: "user",
  });

  newMessage.value = "";
  isThinking.value = true;

  scrollToBottom();

  try {
    const response = await http.post(
      "/chat/",
      {
        message: userMessage,
        history: chatHistory.value,
      },
      {
        // IMPORTANTE:
        // no activar el loader global
        silent: true,
      },
    );

    const payload =
      response?.data?.data ??
      response?.data ??
      {};

    const botResponse =
      payload.response ??
      "No pude obtener una respuesta.";

    chatHistory.value =
      payload.history ??
      chatHistory.value;

    messages.value.push({
      text: botResponse,
      sender: "bot",
    });
  } catch (error) {
    console.error(
      "Error enviando mensaje al chat:",
      error,
    );

    const message =
      error?.response?.data?.message ??
      error?.response?.data?.detail ??
      error?.message ??
      "Error de conexión";

    messages.value.push({
      text: `Error: ${message}`,
      sender: "bot",
    });
  } finally {
    isThinking.value = false;
    scrollToBottom();
  }
}
</script>


<template>
  <div ref="chatbotRef">
    <!-- Botón flotante -->
    <button
      type="button"
      class="
        fixed
        z-50
        w-20
        h-20
        bg-primary
        rounded-full
        flex
        items-center
        justify-center
        text-white
        hover:scale-110
        transition-transform
        cursor-grab
        active:cursor-grabbing
        shadow-xl
      "
      :style="{
        bottom:
          position.y + 'px',

        right:
          position.x + 'px',
      }"
      @click="toggleChat"
      @mousedown="startDrag"
    >
      <MessageSquareText
        :size="40"
      />
    </button>


    <!-- Ventana -->
    <Transition
      enter-active-class="
        transition-all
        duration-300
        ease-out
      "
      enter-from-class="
        opacity-0
        scale-95
        translate-y-4
      "
      enter-to-class="
        opacity-100
        scale-100
        translate-y-0
      "
      leave-active-class="
        transition-all
        duration-200
        ease-in
      "
      leave-from-class="
        opacity-100
        scale-100
        translate-y-0
      "
      leave-to-class="
        opacity-0
        scale-95
        translate-y-4
      "
    >
      <div
        v-if="isOpen"
        class="
          fixed
          z-50
          w-80
          h-96
          bg-card
          border
          border-border
          rounded-2xl
          shadow-2xl
          flex
          flex-col
          overflow-hidden
        "
        :style="{
          bottom:
            position.y +
            100 +
            'px',

          right:
            position.x +
            'px',

          top:
            'auto',

          left:
            'auto',
        }"
        @click.stop
        @mousedown.stop
      >
        <!-- Header -->

        <div
          class="
            flex
            items-center
            justify-between
            p-4
            bg-primary
            text-primary-foreground
          "
        >
          <span
            class="font-bold"
          >
            Asistente MauleMed
          </span>

          <div
            class="
              flex
              items-center
              gap-1
            "
          >
            <button
              type="button"
              class="
                hover:bg-primary/20
                p-1
                rounded
              "
              title="Limpiar chat"
              @click="resetChat"
            >
              <RotateCcw
                :size="18"
              />
            </button>

            <button
              type="button"
              class="
                hover:bg-primary/20
                p-1
                rounded
              "
              title="Cerrar"
              @click="toggleChat"
            >
              <X
                :size="18"
              />
            </button>
          </div>
        </div>


        <!-- Mensajes -->

        <div
          ref="messagesContainer"
          class="
            flex-1
            p-4
            overflow-y-auto
            space-y-3
            bg-muted/20
          "
        >
          <div
            v-for="(
              msg,
              idx
            ) in messages"
            :key="idx"
            :class="[
              'p-3 rounded-lg text-sm max-w-[80%]',

              msg.sender ===
              'user'
                ? 'bg-primary text-primary-foreground self-end ml-auto'
                : 'bg-muted text-foreground self-start',
            ]"
          >
            {{ msg.text }}
          </div>

          <div
            v-if="isThinking"
            class="
              p-3
              rounded-lg
              text-sm
              bg-muted
              text-foreground
              self-start
            "
          >
            Pensando...
          </div>
        </div>


        <!-- Input -->

        <form
          class="
            p-3
            border-t
            border-border
            flex
            gap-2
            bg-card
          "
          action="#"
          @submit.prevent.stop="
            sendMessage
          "
        >
          <input
            v-model="newMessage"
            type="text"
            autocomplete="off"
            placeholder="
              Escribe tu mensaje...
            "
            class="
              flex-1
              px-3
              py-2
              text-sm
              border
              rounded-md
              bg-background
              focus:outline-none
              focus:ring-2
              focus:ring-primary/20
            "
            :disabled="
              isThinking
            "
          />

          <button
            type="submit"
            class="
              p-2
              bg-primary
              text-primary-foreground
              rounded-md
              hover:bg-primary/90
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
            :disabled="
              isThinking ||
              !newMessage.trim()
            "
          >
            <Send
              :size="16"
            />
          </button>
        </form>
      </div>
    </Transition>
  </div>
</template>