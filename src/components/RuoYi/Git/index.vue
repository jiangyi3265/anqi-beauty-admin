<template>
  <div>
    <svg-icon icon-class="github" @click="goto" />
  </div>
</template>

<script setup>
const url = ref('https://github.com/jiangyi3265/anqi-beauty-admin')

function goto() {
  window.open(url.value)
}
</script>

