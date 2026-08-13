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

// =============================================
// ✏️ 비밀번호를 여기서 변경하세요!
const PASSWORD = 'pick1234';
// =============================================

// 상태 관리
let categories = [];
let currentSearchTerm = '';
let currentModalAction = null; // { type: 'CATEGORY' | 'ITEM' | 'PASSWORD', categoryId?: string }
let isEditMode = false;
let currentTab = 'BOUGHT'; // 'BOUGHT' (내 추천템) | 'WISH' (먹기 전 위시템)

// DOM 요소
const elements = {
    categoriesGrid: document.getElementById('categoriesGrid'),
    searchInput: document.getElementById('searchInput'),
    addCategoryBtn: document.getElementById('addCategoryBtn'),
    emptyState: document.getElementById('emptyState'),
    noResults: document.getElementById('noResults'),
    lockBtn: document.getElementById('lockBtn'),
    lockIcon: document.getElementById('lockIcon'),
    tabBought: document.getElementById('tabBought'),
    tabWish: document.getElementById('tabWish'),

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
    updateEditUI();
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

// 로컬 및 DB에 데이터 업데이트 공통 처리
function saveData() {
    setDoc(docRef, { categories }).catch((error) => {
        console.error("데이터 저장 실패:", error);
    });
}

// --- 유틸리티 ---
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// --- 편집 모드 UI 업데이트 ---
function updateEditUI() {
    elements.lockIcon.className = isEditMode ? 'ph ph-lock-open' : 'ph ph-lock';
    elements.lockBtn.title = isEditMode ? '편집 모드 잠금' : '편집 모드 해제 (비밀번호 필요)';
    elements.lockBtn.classList.toggle('unlocked', isEditMode);

    elements.addCategoryBtn.classList.toggle('hidden', !isEditMode);

    render();
}

// --- 탭 전환 ---
function switchTab(tab) {
    currentTab = tab;
    elements.tabBought.classList.toggle('active', tab === 'BOUGHT');
    elements.tabWish.classList.toggle('active', tab === 'WISH');
    render();
}

// --- 렌더링 ---
function render() {
    elements.categoriesGrid.innerHTML = '';

    // 검색 및 탭 필터링
    let filteredCategories = [];

    const lowerTerm = currentSearchTerm.toLowerCase();

    filteredCategories = categories.map(cat => {
        const catMatches = cat.name.toLowerCase().includes(lowerTerm);
        
        // 탭 조건 필터링 (WISH는 isWish === true / BOUGHT는 isWish === false 또는 undefined)
        const tabItems = cat.items.filter(item => 
            currentTab === 'WISH' ? item.isWish === true : !item.isWish
        );

        // 검색어 조건 필터링
        const matchedItems = tabItems.filter(item =>
            item.brand.toLowerCase().includes(lowerTerm)
        );

        const hasItemsInTab = tabItems.length > 0;
        const isEmptyCategory = cat.items.length === 0;

        if (currentSearchTerm.trim() === '') {
            // 검색어가 없을 때: 해당 탭에 아이템이 있거나, 아예 텅 빈 카테고리이면서 편집 모드일 때만 표시
            if (hasItemsInTab || (isEmptyCategory && isEditMode)) {
                return {
                    ...cat,
                    items: tabItems
                };
            }
        } else {
            // 검색어가 있을 때: 카테고리명이 일치하거나 매칭되는 아이템이 있을 때 표시
            if (catMatches || matchedItems.length > 0) {
                return {
                    ...cat,
                    items: catMatches ? tabItems : matchedItems
                };
            }
        }
        return null;
    }).filter(cat => cat !== null);

    // 빈 상태 표시 처리
    if (categories.length === 0) {
        elements.emptyState.classList.remove('hidden');
        elements.noResults.classList.add('hidden');
        elements.categoriesGrid.style.display = 'none';

        elements.emptyState.querySelector('h2').textContent = "아직 등록된 카테고리가 없습니다";
        elements.emptyState.querySelector('p').textContent = isEditMode
            ? "우측 상단의 '카테고리 추가' 버튼을 눌러 시작해보세요."
            : "아직 등록된 카테고리가 없습니다.";
        return;
    } else if (filteredCategories.length === 0) {
        if (currentSearchTerm.trim() !== '') {
            elements.emptyState.classList.add('hidden');
            elements.noResults.classList.remove('hidden');
            elements.categoriesGrid.style.display = 'none';
        } else {
            elements.emptyState.classList.remove('hidden');
            elements.noResults.classList.add('hidden');
            elements.categoriesGrid.style.display = 'none';
            
            if (currentTab === 'WISH') {
                elements.emptyState.querySelector('h2').textContent = "아직 먹기 전 위시템이 없습니다";
                elements.emptyState.querySelector('p').textContent = isEditMode
                    ? "링크를 추가할 때 '아직 먹기 전'을 체크해 위시리스트에 담아보세요!"
                    : "아직 추가된 위시템이 없습니다.";
            } else {
                elements.emptyState.querySelector('h2').textContent = "아직 추천템이 없습니다";
                elements.emptyState.querySelector('p').textContent = isEditMode
                    ? "카테고리를 추가하고 먹어본 추천 브랜드의 링크를 등록해보세요!"
                    : "아직 추가된 추천템이 없습니다.";
            }
        }
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

        header.appendChild(title);

        if (isEditMode) {
            const deleteCatBtn = document.createElement('button');
            deleteCatBtn.className = 'icon-btn danger';
            deleteCatBtn.innerHTML = '<i class="ph ph-trash"></i>';
            deleteCatBtn.title = '카테고리 삭제';
            deleteCatBtn.onclick = () => deleteCategory(cat.id);
            header.appendChild(deleteCatBtn);
        }

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
            itemRow.appendChild(info);

            if (isEditMode) {
                // 위시리스트 탭이고 편집 모드일 때만 체크(완료) 버튼 추가
                if (currentTab === 'WISH') {
                    const checkItemBtn = document.createElement('button');
                    checkItemBtn.className = 'icon-btn success';
                    checkItemBtn.innerHTML = '<i class="ph ph-check"></i>';
                    checkItemBtn.title = '먹어봄 (추천템으로 이동)';
                    checkItemBtn.onclick = () => checkItem(cat.id, item.id);
                    itemRow.appendChild(checkItemBtn);
                }

                const deleteItemBtn = document.createElement('button');
                deleteItemBtn.className = 'icon-btn danger';
                deleteItemBtn.innerHTML = '<i class="ph ph-x"></i>';
                deleteItemBtn.title = '삭제';
                deleteItemBtn.onclick = () => deleteItem(cat.id, item.id);
                itemRow.appendChild(deleteItemBtn);
            }

            itemsList.appendChild(itemRow);
        });

        body.appendChild(itemsList);

        if (isEditMode) {
            const addItemBtn = document.createElement('button');
            addItemBtn.className = 'add-item-btn';
            addItemBtn.innerHTML = '<i class="ph ph-plus"></i> 링크 추가';
            addItemBtn.onclick = () => openItemModal(cat.id);
            body.appendChild(addItemBtn);
        }

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

    elements.lockBtn.addEventListener('click', () => {
        if (isEditMode) {
            isEditMode = false;
            updateEditUI();
        } else {
            openPasswordModal();
        }
    });

    elements.tabBought.addEventListener('click', () => switchTab('BOUGHT'));
    elements.tabWish.addEventListener('click', () => switchTab('WISH'));

    elements.closeModalBtn.addEventListener('click', closeModal);
    elements.cancelModalBtn.addEventListener('click', closeModal);
    elements.modalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.modalOverlay) closeModal();
    });

    elements.modalForm.addEventListener('submit', handleModalSubmit);
}

// --- 모달 관리 ---
function openPasswordModal() {
    currentModalAction = { type: 'PASSWORD' };
    elements.modalTitle.textContent = '편집 모드 잠금 해제';
    elements.modalInputs.innerHTML = `
        <div class="form-group">
            <label for="passwordInput">비밀번호</label>
            <input type="password" id="passwordInput" required placeholder="비밀번호를 입력하세요" autocomplete="off">
            <p id="passwordError" class="error-msg hidden">비밀번호가 올바르지 않습니다.</p>
        </div>
    `;
    elements.modalOverlay.classList.remove('hidden');
    setTimeout(() => document.getElementById('passwordInput').focus(), 100);
}

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
        <div class="form-checkbox-group">
            <input type="checkbox" id="itemIsWish" ${currentTab === 'WISH' ? 'checked' : ''}>
            <label for="itemIsWish">아직 먹기 전 (위시리스트에 추가)</label>
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

    if (currentModalAction.type === 'PASSWORD') {
        const entered = document.getElementById('passwordInput').value;
        if (entered === PASSWORD) {
            isEditMode = true;
            updateEditUI();
            closeModal();
        } else {
            const errEl = document.getElementById('passwordError');
            errEl.classList.remove('hidden');
            document.getElementById('passwordInput').value = '';
            document.getElementById('passwordInput').focus();
        }
        return;
    }

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
        const isWish = document.getElementById('itemIsWish').checked;

        if (brand && link) {
            const cat = categories.find(c => c.id === currentModalAction.categoryId);
            if (cat) {
                cat.items.push({
                    id: generateId(),
                    brand,
                    link,
                    isWish: isWish
                });
            }
        }
    }

    saveData();
    render();
    closeModal();
}

// --- 완료(먹어봄) 처리 ---
function checkItem(categoryId, itemId) {
    const cat = categories.find(c => c.id === categoryId);
    if (cat) {
        const item = cat.items.find(i => i.id === itemId);
        if (item) {
            item.isWish = false; // 위시 해제 -> 추천템 이동
            saveData();
            render();
        }
    }
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
