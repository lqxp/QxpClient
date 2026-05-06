<script setup lang="ts">
import { provide } from "vue";
import { useI18n } from "@/composables/useI18n";

const i18n = useI18n();
provide("i18n", i18n);
</script>

<template>
  <router-view />
</template>
