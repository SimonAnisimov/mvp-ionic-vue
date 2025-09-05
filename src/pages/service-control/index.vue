<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Контроль отпуска услуг</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div class="service-control-container">
        <!-- Фильтры -->
        <ion-card>
          <ion-card-content>
            <!-- Дата -->
            <ion-item>
              <ion-label position="stacked">Дата:</ion-label>
              <ion-input
                v-model="displayDate"
                @ionInput="handleDateChange"
                placeholder="ДД.ММ.ГГГГ"
              ></ion-input>
            </ion-item>

            <!-- Поиск по пациентам -->
            <ion-item>
              <ion-label position="stacked">Поиск по пациентам:</ion-label>
              <div class="search-container">
                <ion-input
                  v-model="filters.search"
                  placeholder="Введите имя пациента"
                  class="search-input"
                ></ion-input>
                <ion-button 
                  @click="handleNFCScan"
                  :disabled="nfcScanState === 'scanning'"
                  size="small"
                  class="nfc-button"
                >
                  📱 NFC
                </ion-button>
              </div>
            </ion-item>

            <!-- Точка сервиса (отключена) -->
            <ion-item>
              <ion-label position="stacked" color="medium">Точка сервиса:</ion-label>
              <ion-input
                value="Все точки сервиса"
                readonly
                color="medium"
              ></ion-input>
            </ion-item>

            <ion-button 
              expand="block" 
              @click="handleSearch"
              :disabled="loading"
              color="success"
              class="search-button"
            >
              <ion-spinner v-if="loading" name="crescent"></ion-spinner>
              <span v-else>Найти услуги</span>
            </ion-button>
          </ion-card-content>
        </ion-card>

        <!-- Результаты поиска -->
        <ion-card v-if="searchResults">
          <ion-card-header>
            <ion-card-title>
              Результаты поиска: {{ searchResults.totalCount }} услуг 
              (отпущено: {{ searchResults.releasedCount }})
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <!-- Список клиентов -->
            <div v-for="customer in customerData" :key="customer.name" class="customer-container">
              <ion-item 
                button 
                @click="toggleCustomer(customer.name)"
                class="customer-item"
              >
                <ion-icon :icon="person" slot="start" color="primary"></ion-icon>
                <ion-label>
                  <h2>{{ customer.name }}</h2>
                  <p>Всего услуг: {{ customer.totalCount }}, Отпущено: {{ customer.releasedCount }}</p>
                </ion-label>
                <ion-icon 
                  :icon="expandedCustomers.has(customer.name) ? chevronDown : chevronForward" 
                  slot="end"
                ></ion-icon>
              </ion-item>

              <!-- Группы услуг клиента -->
              <div v-if="expandedCustomers.has(customer.name)" class="customer-groups">
                <div 
                  v-for="groupData in Array.from(customer.groups.values())" 
                  :key="groupData.group.id"
                  class="group-container"
                >
                  <ion-item 
                    button 
                    @click="toggleGroup(customer.name, groupData.group.id)"
                    class="group-item"
                  >
                    <ion-label>
                      <h3>{{ groupData.group.name }}</h3>
                      <p>Всего: {{ groupData.totalCount }}, Отпущено: {{ groupData.releasedCount }}</p>
                    </ion-label>
                    <ion-icon 
                      :icon="expandedGroups.has(`${customer.name}-${groupData.group.id}`) ? chevronDown : chevronForward" 
                      slot="end"
                    ></ion-icon>
                  </ion-item>

                  <!-- Список услуг в группе -->
                  <div 
                    v-if="expandedGroups.has(`${customer.name}-${groupData.group.id}`)" 
                    class="items-list"
                  >
                    <ion-item 
                      v-for="item in groupData.items" 
                      :key="item.id"
                      :button="!item.isReleased"
                      @click="handleItemPress(item, customer.name)"
                      :class="{ 'released-item': item.isReleased, 'clickable-item': !item.isReleased }"
                    >
                      <ion-icon 
                        v-if="item.isReleased" 
                        :icon="checkmarkCircle" 
                        slot="start" 
                        color="success"
                      ></ion-icon>
                      <ion-label>
                        <h4 :class="{ 'released-text': item.isReleased }">
                          {{ item.nomenclature.name }}
                        </h4>
                        <p v-if="item.isReleased" class="released-label">Отпущено</p>
                      </ion-label>
                      <ion-note 
                        slot="end" 
                        :color="item.isReleased ? 'medium' : 'success'"
                        :class="{ 'released-price': item.isReleased }"
                      >
                        {{ item.nomenclature.price.toFixed(2) }} ₽
                      </ion-note>
                    </ion-item>
                  </div>
                </div>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Модальное окно отпуска услуги -->
      <ion-modal :is-open="releaseDialogVisible" @didDismiss="handleCancelRelease">
        <ion-header>
          <ion-toolbar>
            <ion-title>Отпуск услуги</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="handleCancelRelease">
                <ion-icon :icon="close"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <div class="modal-content" v-if="selectedItem">
            <ion-list>
              <ion-item>
                <ion-label>
                  <h3>Клиент:</h3>
                  <p>{{ selectedItem.customerName }}</p>
                </ion-label>
              </ion-item>
              
              <ion-item>
                <ion-label>
                  <h3>Услуга:</h3>
                  <p>{{ selectedItem.item.nomenclature.name }}</p>
                </ion-label>
              </ion-item>
              
              <ion-item>
                <ion-label>
                  <h3>Цена:</h3>
                  <p class="price-text">{{ selectedItem.item.nomenclature.price.toFixed(2) }} ₽</p>
                </ion-label>
              </ion-item>
            </ion-list>

            <div class="modal-buttons">
              <ion-button 
                expand="block" 
                fill="outline" 
                @click="handleCancelRelease"
              >
                Отмена
              </ion-button>
              
              <ion-button 
                expand="block" 
                @click="handleReleaseService"
                :disabled="releaseLoading"
                color="success"
              >
                <ion-spinner v-if="releaseLoading" name="crescent"></ion-spinner>
                <span v-else>Отпустить</span>
              </ion-button>
            </div>
          </div>
        </ion-content>
      </ion-modal>

      <!-- Модальное окно NFC сканирования -->
      <ion-modal :is-open="nfcModalVisible" @didDismiss="handleCancelNFCScan">
        <ion-header>
          <ion-toolbar>
            <ion-title>NFC Сканирование</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="handleCancelNFCScan">
                <ion-icon :icon="close"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <div class="nfc-modal-content">
            <div class="nfc-scan-animation">
              <ion-spinner v-if="nfcScanState === 'scanning'" name="crescent" color="light"></ion-spinner>
              <div v-else class="nfc-icon">📱</div>
            </div>
            
            <ion-text>
              <h2>{{ nfcScanState === 'scanning' ? 'Поднесите карту к устройству...' : 'Готов к сканированию' }}</h2>
            </ion-text>
            
            <ion-button 
              expand="block" 
              fill="outline" 
              @click="handleCancelNFCScan"
              class="nfc-cancel-button"
            >
              Отмена
            </ion-button>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
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
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonSpinner,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonModal,
  IonList,
  IonNote,
  IonText,
  alertController
} from '@ionic/vue';
import { 
  person, 
  chevronForward, 
  chevronDown, 
  checkmarkCircle, 
  close 
} from 'ionicons/icons';
import ServiceReleaseService from '../../services/ServiceReleaseService';
import NFCService from '../../services/NFCService';
import { 
  ServiceReleaseFilters, 
  ServiceReleaseSearchResponse, 
  ItemRelease, 
  ServiceReleaseGroup 
} from '../../types/serviceRelease';
import { NFCScanState } from '../../types/nfc';

interface CustomerGroupData {
  group: ServiceReleaseGroup;
  totalCount: number;
  releasedCount: number;
  items: ItemRelease[];
}

interface CustomerData {
  name: string;
  totalCount: number;
  releasedCount: number;
  groups: Map<number, CustomerGroupData>;
}

const filters = ref<ServiceReleaseFilters>(ServiceReleaseService.getDefaultFilters());
const loading = ref(false);
const releaseLoading = ref(false);
const searchResults = ref<ServiceReleaseSearchResponse | null>(null);
const expandedCustomers = ref<Set<string>>(new Set());
const expandedGroups = ref<Set<string>>(new Set());
const releaseDialogVisible = ref(false);
const selectedItem = ref<{ item: ItemRelease; customerName: string } | null>(null);
const nfcScanState = ref<NFCScanState>(NFCScanState.IDLE);
const nfcModalVisible = ref(false);

const displayDate = ref('');

const customerData = computed((): CustomerData[] => {
  if (!searchResults.value) return [];
  
  const customerMap = new Map<string, CustomerData>();
  
  searchResults.value.itemToReleaseGroups.forEach(group => {
    group.itemReleases.forEach(item => {
      const customerName = item.customerName;
      if (!customerMap.has(customerName)) {
        customerMap.set(customerName, {
          name: customerName,
          totalCount: 0,
          releasedCount: 0,
          groups: new Map<number, CustomerGroupData>()
        });
      }
      
      const customer = customerMap.get(customerName);
      if (customer) {
        customer.totalCount += item.totalCount;
        customer.releasedCount += item.releasedCount;
        
        if (!customer.groups.has(group.group.id)) {
          customer.groups.set(group.group.id, {
            group: group.group,
            totalCount: 0,
            releasedCount: 0,
            items: []
          });
        }
        
        const customerGroup = customer.groups.get(group.group.id);
        if (customerGroup) {
          customerGroup.totalCount += item.totalCount;
          customerGroup.releasedCount += item.releasedCount;
          customerGroup.items.push(item);
        }
      }
    });
  });
  
  return Array.from(customerMap.values());
});

function formatDateForInput(dateString: string): string {
  const [year, month, day] = dateString.split('-');
  return `${day}.${month}.${year}`;
}

function parseDateFromInput(dateString: string): string {
  const parts = dateString.split('.');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateString;
}

function handleDateChange(event: any) {
  const inputDate = event.target.value;
  const parsedDate = parseDateFromInput(inputDate);
  filters.value.dateFrom = parsedDate;
  filters.value.dateTo = parsedDate;
}

async function handleSearch() {
  try {
    loading.value = true;
    const result = await ServiceReleaseService.searchServicesToRelease(filters.value);
    searchResults.value = result;
  } catch (error: any) {
    const alert = await alertController.create({
      header: 'Ошибка',
      message: error.message || 'Не удалось выполнить поиск',
      buttons: ['OK']
    });
    await alert.present();
    searchResults.value = null;
  } finally {
    loading.value = false;
  }
}

function handleItemPress(item: ItemRelease, customerName: string) {
  if (!item.isReleased) {
    selectedItem.value = { item, customerName };
    releaseDialogVisible.value = true;
  }
}

async function handleReleaseService() {
  if (!selectedItem.value) {
    const alert = await alertController.create({
      header: 'Ошибка',
      message: 'Не выбрана услуга для отпуска',
      buttons: ['OK']
    });
    await alert.present();
    return;
  }

  try {
    releaseLoading.value = true;
    
    await ServiceReleaseService.releaseService(
      selectedItem.value.item.id,
      selectedItem.value.item.pointOfService?.id ?? 1,
      1
    );

    const alert = await alertController.create({
      header: 'Успех',
      message: 'Услуга успешно отпущена',
      buttons: ['OK']
    });
    await alert.present();
    
    // Обновляем результаты поиска
    await handleSearch();
    
    releaseDialogVisible.value = false;
    selectedItem.value = null;
  } catch (error: any) {
    const alert = await alertController.create({
      header: 'Ошибка',
      message: error.message || 'Не удалось отпустить услугу',
      buttons: ['OK']
    });
    await alert.present();
  } finally {
    releaseLoading.value = false;
  }
}

function handleCancelRelease() {
  releaseDialogVisible.value = false;
  selectedItem.value = null;
}

function toggleCustomer(customerName: string) {
  if (expandedCustomers.value.has(customerName)) {
    expandedCustomers.value.delete(customerName);
  } else {
    expandedCustomers.value.add(customerName);
  }
}

function toggleGroup(customerName: string, groupId: number) {
  const key = `${customerName}-${groupId}`;
  if (expandedGroups.value.has(key)) {
    expandedGroups.value.delete(key);
  } else {
    expandedGroups.value.add(key);
  }
}

async function handleNFCScan() {
  try {
    nfcModalVisible.value = true;
    nfcScanState.value = NFCScanState.SCANNING;

    const result = await NFCService.scanCard();
    
    if (result.success && result.cardholderName) {
      nfcScanState.value = NFCScanState.SUCCESS;
      
      // Обновляем фильтры с именем с карты
      filters.value.search = result.cardholderName;

      nfcModalVisible.value = false;
      nfcScanState.value = NFCScanState.IDLE;
      
      // Выполняем поиск с новыми фильтрами
      await handleSearch();
    } else {
      nfcScanState.value = NFCScanState.ERROR;
      const alert = await alertController.create({
        header: 'Ошибка NFC',
        message: result.error || 'Не удалось считать данные с карты',
        buttons: [{
          text: 'OK',
          handler: () => {
            nfcModalVisible.value = false;
            nfcScanState.value = NFCScanState.IDLE;
          }
        }]
      });
      await alert.present();
    }
  } catch (error: any) {
    console.error('Ошибка NFC сканирования:', error);
    nfcScanState.value = NFCScanState.ERROR;
    const alert = await alertController.create({
      header: 'Ошибка NFC',
      message: error.message || 'Произошла ошибка при сканировании',
      buttons: [{
        text: 'OK',
        handler: () => {
          nfcModalVisible.value = false;
          nfcScanState.value = NFCScanState.IDLE;
        }
      }]
    });
    await alert.present();
  }
}

async function handleCancelNFCScan() {
  try {
    await NFCService.cancelScan();
  } catch (error) {
    console.error('Ошибка отмены NFC сканирования:', error);
  } finally {
    nfcModalVisible.value = false;
    nfcScanState.value = NFCScanState.IDLE;
  }
}

onMounted(() => {
  filters.value = ServiceReleaseService.getDefaultFilters();
  displayDate.value = formatDateForInput(filters.value.dateFrom);
});
</script>

<style scoped>
.service-control-container {
  padding: 20px;
}

.search-container {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
}

.search-input {
  flex: 1;
}

.nfc-button {
  --padding-start: 12px;
  --padding-end: 12px;
  min-width: 80px;
}

.search-button {
  margin-top: 20px;
}

.customer-container {
  margin-bottom: 15px;
}

.customer-item {
  --background: #e3f2fd;
  --border-color: #2196f3;
  border-left: 4px solid var(--border-color);
}

.customer-groups {
  padding-left: 15px;
  margin-top: 10px;
}

.group-container {
  margin-bottom: 10px;
}

.group-item {
  --background: #f8f9fa;
  --border-color: #28a745;
  border-left: 4px solid var(--border-color);
}

.items-list {
  background: white;
  border-radius: 8px;
  margin-top: 5px;
  border-left: 4px solid #e9ecef;
}

.released-item {
  --background: #f8f9fa;
}

.clickable-item {
  --background: white;
}

.released-text {
  text-decoration: line-through;
  color: #666;
}

.released-label {
  color: #28a745;
  font-weight: 500;
  font-size: 12px;
}

.released-price {
  color: #666;
}

.modal-content {
  padding: 20px;
}

.modal-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.price-text {
  color: #28a745;
  font-weight: 600;
  font-size: 18px;
}

.nfc-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.nfc-scan-animation {
  width: 80px;
  height: 80px;
  border-radius: 40px;
  background: #007AFF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.nfc-icon {
  font-size: 40px;
  color: white;
}

.nfc-cancel-button {
  margin-top: 30px;
}

ion-item {
  --padding-start: 0;
}
</style>
