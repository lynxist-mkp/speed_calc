<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const props = defineProps<{ tex: string }>()
const el = ref<HTMLElement | null>(null)

function render() {
  if (el.value) {
    katex.render(props.tex, el.value, { throwOnError: false })
  }
}

onMounted(render)
watch(() => props.tex, render)
</script>

<template>
  <span ref="el" class="katex-render"></span>
</template>
