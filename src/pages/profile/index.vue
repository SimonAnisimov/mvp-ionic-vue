<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Профиль</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="profile-container">
        <ion-card v-if="userInfo">
          <ion-card-header>
            <ion-card-title>Информация о пользователе</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item v-if="userInfo.lastName || userInfo.firstName">
                <ion-label>
                  <h3>ФИО</h3>
                  <p>{{ fullName }}</p>
                </ion-label>
              </ion-item>
              
              <ion-item v-if="userInfo.identityId">
                <ion-label>
                  <h3>ID пользователя</h3>
                  <p>{{ userInfo.identityId }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>

        <ion-card v-else>
          <ion-card-content>
            <div class="loading-container">
              <ion-spinner name="crescent"></ion-spinner>
              <ion-text>Загрузка информации о пользователе...</ion-text>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>Настройки аккаунта</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list>
              <ion-item button @click="changePassword">
                <ion-icon :icon="keyOutline" slot="start"></ion-icon>
                <ion-label>
                  <h3>Изменить пароль</h3>
                  <p>Обновить пароль для входа в систему</p>
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
  IonText,
  IonSpinner,
  IonIcon,
  IonButtons,
  IonBackButton,
  alertController
} from '@ionic/vue';
import { keyOutline } from 'ionicons/icons';
import AuthService from '../../services/AuthService';
import { QuircoUserModel } from '../../types/auth';

const userInfo = ref<QuircoUserModel | null>(null);

const fullName = computed(() => {
  if (!userInfo.value) return '';
  
  const parts = [
    userInfo.value.lastName,
    userInfo.value.firstName,
    userInfo.value.middleName
  ].filter(Boolean);
  
  return parts.join(' ');
});

async function changePassword() {
  const alert = await alertController.create({
    header: 'Изменение пароля',
    message: 'Функция изменения пароля будет доступна в следующих версиях приложения.',
    buttons: ['OK']
  });
  await alert.present();
}

onMounted(() => {
  userInfo.value = AuthService.getCurrentUser();
});
</script>

<style scoped>
.profile-container {
  padding: 20px;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
}

ion-card {
  margin-bottom: 20px;
}

ion-item {
  --padding-start: 0;
}
</style>
