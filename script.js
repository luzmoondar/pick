import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCdX4pbxKeMQnLL8pBluM9tkRKw8lRbxyU",
  authDomain: "doodo-b7268.firebaseapp.com",
  projectId: "doodo-b7268",
  storageBucket: "doodo-b7268.firebasestorage.app",
  messagingSenderId: "750868227610",
  appId: "1:750868227610:web:a8ca3e7971af8c526793a3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const docRef = doc(db, "appData", "sharedData");

// 상태 관리
let categories = [];
let currentSearchTerm = '';
let currentModalAction = null; // { type: 'CATEGORY' | 'ITEM', categoryId?: string }

// DOM 요소
const elements = {
    categoriesGrid: document.getElementById('categoriesGrid'),
    searchInput: document.getElementById('searchInput'),
    addCategoryBtn: document.getElementById('addCategoryBtn'),
    emptyState: document.getElementById('emptyState'),
    noResults: document.getElementById('noResults'),
    
    // Modal
    modalOverlay: document.getElementById('modalOverlay'),
    modalTitle: document.getElementById('modalTitle'),
    modalForm: document.getElementById('modalForm'),
    modalInputs: document.getElementById('modalInputs'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
};

// --- 초기화 ---
function init() {
    setupEventListeners();
    loadData();
}

// --- 데이터 관리 ---
function loadData() {
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            categories = docSnap.data().categories || [];
        } else {
            categories = [];
        }
        render();
    }, (error) => {
        console.error("데이터 동기화 실패:", error);
    });
}

function saveData() {
    setDoc(docRef, { categories }).catch((error) => {
        console.error("데이터 저장 실패:", error);
    });
}

// --- 유틸리티 ---
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// --- 렌더링 ---
function render() {
    elements.categoriesGrid.innerHTML = '';
    
    // 검색 필터링
    let filteredCategories = [];
    
    if (currentSearchTerm.trim() === '') {
        filteredCategories = categories;
    } else {
        const lowerTerm = currentSearchTerm.toLowerCase();
        
        filteredCategories = categories.map(cat => {
            // 카테고리 이름이 매칭되는지 확인
            const catMatches = cat.name.toLowerCase().includes(lowerTerm);
            
            // 아이템 브랜드명이 매칭되는지 필터링
            const matchedItems = cat.items.filter(item => 
                item.brand.toLowerCase().includes(lowerTerm)
            );
            
            // 카테고리 이름이 매칭되면 모든 아이템 보여주고, 아니면 매칭된 아이템만 보여줌
            if (catMatches || matchedItems.length > 0) {
                return {
                    ...cat,
                    items: catMatches ? cat.items : matchedItems
                };
            }
            return null;
        }).filter(cat => cat !== null);
    }
    
    // 빈 상태 표시 처리
    if (categories.length === 0) {
        elements.emptyState.classList.remove('hidden');
        elements.noResults.classList.add('hidden');
        elements.categoriesGrid.style.display = 'none';
        return;
    } else if (filteredCategories.length === 0) {
        elements.emptyState.classList.add('hidden');
        elements.noResults.classList.remove('hidden');
        elements.categoriesGrid.style.display = 'none';
        return;
    }
    
    elements.emptyState.classList.add('hidden');
    elements.noResults.classList.add('hidden');
    elements.categoriesGrid.style.display = 'grid';
    
    // 카테고리 렌더링
    filteredCategories.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        
        // Header
        const header = document.createElement('div');
        header.className = 'category-header';
        
        const title = document.createElement('div');
        title.className = 'category-title';
        title.textContent = cat.name;
        
        const deleteCatBtn = document.createElement('button');
        deleteCatBtn.className = 'icon-btn danger';
        deleteCatBtn.innerHTML = '<i class="ph ph-trash"></i>';
        deleteCatBtn.title = '카테고리 삭제';
        deleteCatBtn.onclick = () => deleteCategory(cat.id);
        
        header.appendChild(title);
        header.appendChild(deleteCatBtn);
        
        // Body
        const body = document.createElement('div');
        body.className = 'category-body';
        
        const itemsList = document.createElement('div');
        itemsList.className = 'items-list';
        
        cat.items.forEach(item => {
            const itemRow = document.createElement('div');
            itemRow.className = 'item-row';
            
            const info = document.createElement('div');
            info.className = 'item-info';
            
            const brandLink = document.createElement('a');
            brandLink.className = 'item-brand-link';
            brandLink.href = item.link.startsWith('http') ? item.link : `https://${item.link}`;
            brandLink.target = '_blank';
            brandLink.rel = 'noopener noreferrer';
            brandLink.title = item.brand;
            
            const displayText = item.brand.length > 15 ? item.brand.substring(0, 15) + '...' : item.brand;
            brandLink.textContent = displayText;
            
            info.appendChild(brandLink);
            
            const deleteItemBtn = document.createElement('button');
            deleteItemBtn.className = 'icon-btn danger';
            deleteItemBtn.innerHTML = '<i class="ph ph-x"></i>';
            deleteItemBtn.title = '삭제';
            deleteItemBtn.onclick = () => deleteItem(cat.id, item.id);
            
            itemRow.appendChild(info);
            itemRow.appendChild(deleteItemBtn);
            
            itemsList.appendChild(itemRow);
        });
        
        const addItemBtn = document.createElement('button');
        addItemBtn.className = 'add-item-btn';
        addItemBtn.innerHTML = '<i class="ph ph-plus"></i> 링크 추가';
        addItemBtn.onclick = () => openItemModal(cat.id);
        
        body.appendChild(itemsList);
        body.appendChild(addItemBtn);
        
        card.appendChild(header);
        card.appendChild(body);
        
        elements.categoriesGrid.appendChild(card);
    });
}

// --- 이벤트 핸들러 및 로직 ---
function setupEventListeners() {
    elements.searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value;
        render();
    });
    
    elements.addCategoryBtn.addEventListener('click', openCategoryModal);
    
    elements.closeModalBtn.addEventListener('click', closeModal);
    elements.cancelModalBtn.addEventListener('click', closeModal);
    elements.modalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.modalOverlay) closeModal();
    });
    
    elements.modalForm.addEventListener('submit', handleModalSubmit);
}

// --- 모달 관리 ---
function openCategoryModal() {
    currentModalAction = { type: 'CATEGORY' };
    elements.modalTitle.textContent = '새 카테고리 추가';
    elements.modalInputs.innerHTML = `
        <div class="form-group">
            <label for="catName">카테고리 이름</label>
            <input type="text" id="catName" required placeholder="예: 제육, 노트북, 신발 등" autocomplete="off">
        </div>
    `;
    elements.modalOverlay.classList.remove('hidden');
    setTimeout(() => document.getElementById('catName').focus(), 100);
}

function openItemModal(categoryId) {
    currentModalAction = { type: 'ITEM', categoryId };
    elements.modalTitle.textContent = '새 링크 추가';
    elements.modalInputs.innerHTML = `
        <div class="form-group">
            <label for="itemBrand">브랜드 또는 제품명</label>
            <input type="text" id="itemBrand" required placeholder="예: 맛있는제육, 삼성전자 등" autocomplete="off">
        </div>
        <div class="form-group">
            <label for="itemLink">URL 링크 주소</label>
            <input type="url" id="itemLink" required placeholder="https://..." autocomplete="off">
        </div>
    `;
    elements.modalOverlay.classList.remove('hidden');
    setTimeout(() => document.getElementById('itemBrand').focus(), 100);
}

function closeModal() {
    elements.modalOverlay.classList.add('hidden');
    elements.modalForm.reset();
    currentModalAction = null;
}

function handleModalSubmit(e) {
    e.preventDefault();
    
    if (currentModalAction.type === 'CATEGORY') {
        const name = document.getElementById('catName').value.trim();
        if (name) {
            categories.unshift({
                id: generateId(),
                name,
                items: []
            });
        }
    } else if (currentModalAction.type === 'ITEM') {
        const brand = document.getElementById('itemBrand').value.trim();
        const link = document.getElementById('itemLink').value.trim();
        
        if (brand && link) {
            const cat = categories.find(c => c.id === currentModalAction.categoryId);
            if (cat) {
                cat.items.push({
                    id: generateId(),
                    brand,
                    link
                });
            }
        }
    }
    
    saveData();
    render();
    closeModal();
}

// --- 삭제 기능 ---
function deleteCategory(id) {
    if (confirm('이 카테고리와 안에 있는 모든 링크를 삭제하시겠습니까?')) {
        categories = categories.filter(cat => cat.id !== id);
        saveData();
        render();
    }
}

function deleteItem(categoryId, itemId) {
    const cat = categories.find(c => c.id === categoryId);
    if (cat) {
        cat.items = cat.items.filter(item => item.id !== itemId);
        saveData();
        render();
    }
}

// 앱 시작
init();
