<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar color="primary">
        <ion-title>SW-Mobile</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="home-container">
        <!-- Header Section -->
        <div class="header-section">
          <h1 class="app-title">SW-Mobile</h1>
          
          <!-- Property Selection -->
          <div v-if="isLoadingProperties" class="property-loading">
            <ion-spinner name="crescent"></ion-spinner>
            <ion-text>Загрузка объектов...</ion-text>
          </div>
          
          <div v-else-if="properties.length > 1" class="property-select">
            <ion-item>
              <ion-label>Объект:</ion-label>
              <ion-select 
                v-model="selectedPropertyId" 
                @ionChange="handlePropertySelectChange"
                interface="popover"
                placeholder="Выберите объект"
              >
                <ion-select-option 
                  v-for="property in properties" 
                  :key="property.id" 
                  :value="property.id"
                >
                  {{ property.name }}
                </ion-select-option>
              </ion-select>
            </ion-item>
          </div>
          
          <div v-else-if="properties.length === 1" class="single-property">
            <ion-text color="primary">
              <h3>{{ properties[0].name }}</h3>
            </ion-text>
          </div>
          
          <div v-else class="subtitle">
            <ion-text color="medium">Санаторий Mobile</ion-text>
          </div>
        </div>

        <!-- Menu Items -->
        <div class="menu-container">
          <ion-card 
            v-for="(item, index) in menuItems" 
            :key="index"
            :class="{ 'logout-card': item.isLogout }"
            @click="item.onPress"
            :disabled="isLoggingOut && item.isLogout"
          >
            <ion-card-content>
              <div class="menu-item-content">
                <div class="menu-icon">{{ item.icon }}</div>
                <div class="menu-text">
                  <ion-text :color="item.isLogout ? 'danger' : 'dark'">
                    <h3>{{ item.title }}</h3>
                  </ion-text>
                </div>
                <div class="menu-arrow">
                  <ion-spinner 
                    v-if="isLoggingOut && item.isLogout" 
                    name="crescent" 
                    color="danger"
                  ></ion-spinner>
                  <ion-icon 
                    v-else 
                    :icon="chevronForward" 
                    :color="item.isLogout ? 'danger' : 'medium'"
                  ></ion-icon>
                </div>
              </div>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Footer -->
        <div class="footer">
          <ion-text color="medium">
            <p>Версия 1.0.0</p>
            <p v-if="serverUrl">Сервер: {{ serverUrl }}</p>
          </ion-text>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonText,
  IonSpinner,
  IonIcon,
  alertController
} from '@ionic/vue';
import { chevronForward } from 'ionicons/icons';
import AuthService from '../../services/AuthService';
import PropertyService from '../../services/PropertyService';
import { Property } from '../../types/property';

const router = useRouter();
const isLoggingOut = ref(false);
const properties = ref<Property[]>([]);
const selectedProperty = ref<Property | null>(null);
const isLoadingProperties = ref(true);

const selectedPropertyId = computed({
  get: () => selectedProperty.value?.id || null,
  set: (value: number | null) => {
    if (value) {
      const property = properties.value.find(p => p.id === value);
      if (property) {
        handlePropertyChange(property);
      }
    }
  }
});

const serverUrl = computed(() => {
  const url = AuthService.getServerUrl();
  return url?.replace('https://', '').replace('http://', '');
});

const menuItems = [
  {
    title: 'Контроль отпуска услуг',
    icon: '🏥',
    onPress: () => router.push('/service-control'),
  },
  {
    title: 'Профиль пользователя',
    icon: '👤',
    onPress: () => router.push('/profile'),
  },
  {
    title: 'Настройки',
    icon: '⚙️',
    onPress: () => router.push('/settings'),
  },
  {
    title: 'Выход',
    icon: '🚪',
    onPress: handleLogout,
    isLogout: true,
  },
];

async function loadProperties() {
  try {
    isLoadingProperties.value = true;
    
    // Сначала пытаемся получить из кэша
    const cachedProperties = PropertyService.getPropertiesList();
    const cachedSelected = PropertyService.getSelectedProperty();
    
    if (cachedProperties.length > 0) {
      properties.value = cachedProperties;
      selectedProperty.value = cachedSelected;
      isLoadingProperties.value = false;
    }
    
    // Затем обновляем с сервера
    const freshProperties = await PropertyService.getProperties();
    properties.value = freshProperties;
    selectedProperty.value = PropertyService.getSelectedProperty();
  } catch (error) {
    console.error('Ошибка при загрузке объектов:', error);
    const alert = await alertController.create({
      header: 'Ошибка',
      message: 'Не удалось загрузить список объектов',
      buttons: ['OK']
    });
    await alert.present();
  } finally {
    isLoadingProperties.value = false;
  }
}

async function handlePropertySelectChange(event: any) {
  const propertyId = event.detail.value;
  if (propertyId) {
    const property = properties.value.find(p => p.id === propertyId);
    if (property) {
      await handlePropertyChange(property);
    }
  }
}

async function handlePropertyChange(property: Property) {
  if (property && property.id !== selectedProperty.value?.id) {
    try {
      await PropertyService.selectProperty(property);
      selectedProperty.value = property;
    } catch (error) {
      console.error('Ошибка при выборе объекта:', error);
      const alert = await alertController.create({
        header: 'Ошибка',
        message: 'Не удалось выбрать объект',
        buttons: ['OK']
      });
      await alert.present();
    }
  }
}

async function handleLogout() {
  const alert = await alertController.create({
    header: 'Выход',
    message: 'Вы уверены, что хотите выйти из системы?',
    buttons: [
      {
        text: 'Отмена',
        role: 'cancel',
      },
      {
        text: 'Выйти',
        role: 'destructive',
        handler: performLogout,
      },
    ]
  });
  await alert.present();
}

async function performLogout() {
  isLoggingOut.value = true;
  try {
    console.log('Начинаем процесс выхода...');
    await AuthService.logout();
    console.log('Logout выполнен успешно');
    
    // Переходим на страницу входа
    router.replace('/auth');
  } catch (error) {
    console.error('Ошибка при выходе:', error);
    const alert = await alertController.create({
      header: 'Ошибка',
      message: 'Произошла ошибка при выходе из системы',
      buttons: ['OK']
    });
    await alert.present();
  } finally {
    isLoggingOut.value = false;
  }
}

onMounted(() => {
  loadProperties();
});
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header-section {
  text-align: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, #007AFF 0%, #0056CC 100%);
  color: white;
}

.app-title {
  font-size: 32px;
  font-weight: bold;
  margin: 0 0 20px 0;
}

.property-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 15px;
}

.property-select {
  margin-top: 15px;
  max-width: 300px;
  margin-left: auto;
  margin-right: auto;
}

.property-select ion-item {
  --background: rgba(255, 255, 255, 0.1);
  --color: white;
  border-radius: 8px;
}

.single-property {
  margin-top: 10px;
}

.single-property h3 {
  margin: 0;
  font-weight: 600;
}

.subtitle {
  margin-top: 10px;
  font-style: italic;
}

.menu-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

ion-card {
  margin: 0;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

ion-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.logout-card {
  border: 1px solid #ff3b30;
  background: #fff5f5;
}

.menu-item-content {
  display: flex;
  align-items: center;
  padding: 10px 0;
}

.menu-icon {
  font-size: 24px;
  margin-right: 15px;
  width: 30px;
  text-align: center;
}

.menu-text {
  flex: 1;
}

.menu-text h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.menu-arrow {
  display: flex;
  align-items: center;
}

.footer {
  text-align: center;
  padding: 30px 20px;
}

.footer p {
  margin: 5px 0;
  font-size: 12px;
}

ion-card[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

ion-card[disabled]:hover {
  transform: none;
  box-shadow: none;
}
</style>
