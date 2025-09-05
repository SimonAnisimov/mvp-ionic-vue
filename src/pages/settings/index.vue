<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Настройки</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="settings-container">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Информация о приложении</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item>
                <ion-label>
                  <h3>Версия приложения</h3>
                  <p>1.0.0</p>
                </ion-label>
              </ion-item>
              
              <ion-item v-if="serverUrl">
                <ion-label>
                  <h3>Сервер</h3>
                  <p>{{ serverUrl }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>Настройки приложения</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item button @click="clearCache">
                <ion-icon :icon="trashOutline" slot="start"></ion-icon>
                <ion-label>
                  <h3>Очистить кэш</h3>
                  <p>Удалить временные данные приложения</p>
                </ion-label>
              </ion-item>
              
              <ion-item button @click="showAbout">
                <ion-icon :icon="informationCircleOutline" slot="start"></ion-icon>
                <ion-label>
                  <h3>О приложении</h3>
                  <p>Информация о разработчиках</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>Техническая информация</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item>
                <ion-label>
                  <h3>Платформа</h3>
                  <p>{{ platform }}</p>
                </ion-label>
              </ion-item>
              
              <ion-item>
                <ion-label>
                  <h3>User Agent</h3>
                  <p class="user-agent">{{ userAgent }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Capacitor } from '@capacitor/core';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonButtons,
  IonBackButton,
  alertController,
  toastController
} from '@ionic/vue';
import { trashOutline, informationCircleOutline } from 'ionicons/icons';
import AuthService from '../../services/AuthService';
import PropertyService from '../../services/PropertyService';

const platform = ref('');
const userAgent = ref('');

const serverUrl = computed(() => {
  const url = AuthService.getServerUrl();
  return url?.replace('https://', '').replace('http://', '');
});

async function clearCache() {
  const alert = await alertController.create({
    header: 'Очистка кэша',
    message: 'Вы уверены, что хотите очистить кэш приложения? Это действие нельзя отменить.',
    buttons: [
      {
        text: 'Отмена',
        role: 'cancel',
      },
      {
        text: 'Очистить',
        role: 'destructive',
        handler: async () => {
          try {
            // Очищаем кэш PropertyService
            await PropertyService.clearData();
            
            const toast = await toastController.create({
              message: 'Кэш успешно очищен',
              duration: 2000,
              color: 'success',
              position: 'top'
            });
            await toast.present();
          } catch (error) {
            console.error('Ошибка при очистке кэша:', error);
            const toast = await toastController.create({
              message: 'Ошибка при очистке кэша',
              duration: 2000,
              color: 'danger',
              position: 'top'
            });
            await toast.present();
          }
        }
      },
    ]
  });
  await alert.present();
}

async function showAbout() {
  const alert = await alertController.create({
    header: 'О приложении',
    message: `
      <strong>SW-Mobile</strong><br>
      Версия: 1.0.0<br><br>
      
      Мобильное приложение для управления санаторно-курортными услугами.<br><br>
      
      Разработано с использованием:<br>
      • Ionic Framework<br>
      • Vue.js 3<br>
      • Capacitor<br>
      • TypeScript
    `,
    buttons: ['OK']
  });
  await alert.present();
}

onMounted(() => {
  // Определяем платформу
  if (Capacitor.isNativePlatform()) {
    platform.value = Capacitor.getPlatform();
  } else {
    platform.value = 'Web';
  }
  
  // Получаем User Agent
  userAgent.value = navigator.userAgent;
});
</script>

<style scoped>
.settings-container {
  padding: 20px;
}

ion-card {
  margin-bottom: 20px;
}

ion-item {
  --padding-start: 0;
}

.user-agent {
  font-size: 12px;
  word-break: break-all;
  line-height: 1.3;
}
</style>
