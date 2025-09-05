<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="login-container">
        <div class="header">
          <h1 class="app-title">Вход в систему</h1>
        </div>

        <ion-card>
          <ion-card-content>
            <form @submit.prevent="handleLogin">
              <ion-list>
                <ion-item>
                  <ion-label position="stacked">Сервер</ion-label>
                  <ion-input
                    v-model="form.server"
                    placeholder="example.com или 192.168.1.100:8080"
                    :disabled="loading"
                    autocapitalize="none"
                    autocorrect="off"
                  ></ion-input>
                </ion-item>

                <ion-item>
                  <ion-label position="stacked">Логин</ion-label>
                  <ion-input
                    v-model="form.login"
                    placeholder="Введите логин"
                    :disabled="loading"
                    autocapitalize="none"
                    autocorrect="off"
                  ></ion-input>
                </ion-item>

                <ion-item>
                  <ion-label position="stacked">Пароль</ion-label>
                  <ion-input
                    type="password"
                    v-model="form.password"
                    placeholder="Введите пароль"
                    :disabled="loading"
                    autocapitalize="none"
                    autocorrect="off"
                  ></ion-input>
                </ion-item>
              </ion-list>

              <ion-button
                type="submit"
                expand="block"
                :disabled="loading || !isFormValid"
                class="login-button"
              >
                <ion-spinner v-if="loading" name="crescent"></ion-spinner>
                <span v-else>Войти</span>
              </ion-button>
            </form>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonSpinner,
  IonList,
  alertController
} from '@ionic/vue';
import AuthService from '../../services/AuthService';

const router = useRouter();
const loading = ref(false);

const form = reactive({
  server: '',
  login: '',
  password: ''
});

const isFormValid = computed(() => {
  return form.server.trim() && form.login.trim() && form.password.trim();
});

const showAlert = async (header: string, message: string) => {
  const alert = await alertController.create({
    header,
    message,
    buttons: ['OK']
  });
  await alert.present();
};

const handleLogin = async () => {
  if (!isFormValid.value) {
    await showAlert('Ошибка', 'Пожалуйста, заполните все поля');
    return;
  }

  loading.value = true;

  try {
    await AuthService.login(form.server.trim(), form.login.trim(), form.password.trim());
    
    // При успешном входе переходим на главную страницу
    router.replace('/home');
  } catch (error: any) {
    console.error('Ошибка входа:', error);
    
    // Формируем детальное сообщение об ошибке
    let errorMessage = 'Не удалось войти в систему.';
    let errorDetails = '';
    
    if (error.response) {
      // Ошибка от сервера
      errorDetails = `Код: ${error.response.status}\n`;
      errorDetails += `Сервер: ${form.server}\n`;
      if (error.response.data?.message) {
        errorDetails += `Сообщение: ${error.response.data.message}\n`;
      }
      if (error.response.statusText) {
        errorDetails += `Статус: ${error.response.statusText}\n`;
      }
    } else if (error.request) {
      // Ошибка сети
      errorDetails = `Сервер: ${form.server}\n`;
      errorDetails += `Тип: Ошибка сети\n`;
      errorDetails += `Детали: ${error.message || 'Нет соединения с сервером'}\n`;
      if (error.code) {
        errorDetails += `Код ошибки: ${error.code}\n`;
      }
    } else {
      // Другие ошибки
      errorDetails = `Ошибка: ${error.message || 'Неизвестная ошибка'}\n`;
    }
    
    await showAlert(
      'Ошибка входа',
      errorMessage + '\n\n' + errorDetails.trim()
    );
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #f5f5f5;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.app-title {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin: 0;
}

ion-card {
  max-width: 400px;
  margin: 0 auto;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.login-button {
  margin-top: 20px;
  --background: #007AFF;
}

.login-button[disabled] {
  --background: #999;
}

ion-input {
  --padding-start: 0;
}

ion-item {
  --padding-start: 0;
  --inner-padding-end: 0;
}

ion-label {
  font-weight: 600;
  color: #333;
}
</style>
