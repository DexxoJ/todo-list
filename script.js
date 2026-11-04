
// ========================================
// 1. HTML-элементы
// ========================================

const taskForm = document.querySelector("#taskForm");
const taskInput = document.querySelector("#taskInput");
const newPriority = document.querySelector("#newPriority");

const taskList = document.querySelector("#taskList");
const taskTotal = document.querySelector("#taskTotal");
const remainingCount = document.querySelector("#remainingCount");

const searchInput = document.querySelector("#searchInput");

const folderSelect = document.querySelector("#folderSelect");
const folderForm = document.querySelector("#folderForm");
const folderInput = document.querySelector("#folderInput");
const deleteFolderButton = document.querySelector("#deleteFolderButton");

const categorySelect = document.querySelector("#categorySelect");
const categoryForm = document.querySelector("#categoryForm");
const categoryInput = document.querySelector("#categoryInput");
const deleteCategoryButton = document.querySelector("#deleteCategoryButton");

const emptyState = document.querySelector("#emptyState");
const emptyTitle = document.querySelector("#emptyTitle");
const emptyDescription = document.querySelector("#emptyDescription");

const clearButton = document.querySelector("#clearButton");
const undoButton = document.querySelector("#undoButton");
const themeToggle = document.querySelector("#themeToggle");

const filterButtons = document.querySelectorAll(".filter");


// ========================================
// 2. Начальные данные
// ========================================

const STORAGE_KEY = "todo-list-data";

const PRIORITIES = {
    low: "Низкий",
    medium: "Средний",
    high: "Высокий"
};

const PRIORITY_ORDER = {
    high: 1,
    medium: 2,
    low: 3
};

function createId() {
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createInitialData() {
    const folderId = createId();

    return {
        tasks: [],
        folders: [
            {
                id: folderId,
                name: "Личное",
                categories: []
            }
        ],
        activeFolderId: folderId,
        activeCategoryId: "all",
        lastDeleted: null
    };
}


// ========================================
// 3. Загрузка данных
// ========================================

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return createInitialData();
        }

        const data = JSON.parse(saved);

        if (
            !data ||
            !Array.isArray(data.tasks) ||
            !Array.isArray(data.folders) ||
            data.folders.length === 0
        ) {
            return createInitialData();
        }

        data.folders = data.folders.map(folder => ({
            ...folder,
            categories: Array.isArray(folder.categories)
                ? folder.categories
                : []
        }));

        data.tasks = data.tasks.map((task, index) => ({
            ...task,
            priority: PRIORITIES[task.priority]
                ? task.priority
                : "medium",
            order: Number.isFinite(Number(task.order))
                ? Number(task.order)
                : index + 1,
            completed: Boolean(task.completed)
        }));

        if (!data.folders.some(folder => folder.id === data.activeFolderId)) {
            data.activeFolderId = data.folders[0].id;
        }

        return data;

    } catch (error) {
        console.error("Ошибка загрузки:", error);
        return createInitialData();
    }
}

let data = loadData();

let tasks = data.tasks;
let folders = data.folders;

let activeFolderId = data.activeFolderId;
let activeCategoryId = data.activeCategoryId || "all";

let lastDeleted = data.lastDeleted || null;

let currentFilter = "all";
let searchQuery = "";
let editingTaskId = null;
let draggedTaskId = null;


// ========================================
// 4. Сохранение данных
// ========================================

function saveData() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                tasks,
                folders,
                activeFolderId,
                activeCategoryId,
                lastDeleted
            })
        );

    } catch (error) {
        console.error("Ошибка сохранения:", error);
        alert("Не удалось сохранить данные в браузере.");
    }
}


// ========================================
// 5. Вспомогательные функции
// ========================================

function getActiveFolder() {
    return folders.find(
        folder => folder.id === activeFolderId
    ) || folders[0];
}

function getCurrentTasks() {
    return tasks.filter(task => {
        const correctFolder = task.folderId === activeFolderId;

        const correctCategory =
            activeCategoryId === "all" ||
            task.categoryId === activeCategoryId;

        return correctFolder && correctCategory;
    });
}

function getTasksLabel(number) {
    const lastTwo = number % 100;
    const last = number % 10;

    if (lastTwo >= 11 && lastTwo <= 14) {
        return "задач";
    }

    if (last === 1) {
        return "задача";
    }

    if (last >= 2 && last <= 4) {
        return "задачи";
    }

    return "задач";
}


// ========================================
// 6. Отображение папок и категорий
// ========================================

function renderWorkspace() {
    folderSelect.replaceChildren();

    folders.forEach(folder => {
        const option = document.createElement("option");

        option.value = folder.id;
        option.textContent = folder.name;

        folderSelect.append(option);
    });

    if (!folders.some(folder => folder.id === activeFolderId)) {
        activeFolderId = folders[0].id;
    }

    folderSelect.value = activeFolderId;

    categorySelect.replaceChildren();

    const allOption = document.createElement("option");

    allOption.value = "all";
    allOption.textContent = "Все категории";

    categorySelect.append(allOption);

    const folder = getActiveFolder();

    folder.categories.forEach(category => {
        const option = document.createElement("option");

        option.value = category.id;
        option.textContent = category.name;

        categorySelect.append(option);
    });

    if (
        activeCategoryId !== "all" &&
        !folder.categories.some(
            category => category.id === activeCategoryId
        )
    ) {
        activeCategoryId = "all";
    }

    categorySelect.value = activeCategoryId;

    deleteFolderButton.disabled = folders.length <= 1;
    deleteCategoryButton.disabled = activeCategoryId === "all";
}


// ========================================
// 7. Создание папок
// ========================================

function createFolder(name) {
    const cleanName = name.trim();

    if (!cleanName) return false;

    const exists = folders.some(
        folder => folder.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (exists) {
        alert("Такая папка уже существует.");
        return false;
    }

    const folder = {
        id: createId(),
        name: cleanName,
        categories: []
    };

    folders.push(folder);

    activeFolderId = folder.id;
    activeCategoryId = "all";

    saveData();
    renderAll();

    return true;
}


// ========================================
// 8. Создание категорий
// ========================================

function createCategory(name) {
    const cleanName = name.trim();

    if (!cleanName) return false;

    const folder = getActiveFolder();

    const exists = folder.categories.some(
        category => category.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (exists) {
        alert("Такая категория уже существует.");
        return false;
    }

    const category = {
        id: createId(),
        name: cleanName
    };

    folder.categories.push(category);

    activeCategoryId = category.id;

    saveData();
    renderAll();

    return true;
}


// ========================================
// 9. Удаление папок
// ========================================

function deleteFolder() {
    if (folders.length <= 1) {
        alert("Нельзя удалить последнюю папку.");
        return;
    }

    const folder = getActiveFolder();

    const folderTasks = tasks.filter(
        task => task.folderId === folder.id
    );

    const confirmed = confirm(
        `Удалить папку «${folder.name}» и все задачи внутри неё? ` +
        `Будет удалено задач: ${folderTasks.length}.`
    );

    if (!confirmed) return;

    tasks = tasks.filter(
        task => task.folderId !== folder.id
    );

    folders = folders.filter(
        item => item.id !== folder.id
    );

    activeFolderId = folders[0].id;
    activeCategoryId = "all";

    lastDeleted = null;
    editingTaskId = null;

    saveData();
    renderAll();
}


// ========================================
// 10. Удаление категорий
// ========================================

function deleteCategory() {
    if (activeCategoryId === "all") return;

    const folder = getActiveFolder();

    const category = folder.categories.find(
        item => item.id === activeCategoryId
    );

    if (!category) return;

    const confirmed = confirm(
        `Удалить категорию «${category.name}»? ` +
        "Задачи останутся в папке без категории."
    );

    if (!confirmed) return;

    tasks.forEach(task => {
        if (
            task.folderId === folder.id &&
            task.categoryId === category.id
        ) {
            task.categoryId = "";
        }
    });

    folder.categories = folder.categories.filter(
        item => item.id !== category.id
    );

    activeCategoryId = "all";

    saveData();
    renderAll();
}


// ========================================
// 11. Добавление задачи
// ========================================

function addTask(text) {
    const cleanText = text.trim();

    if (!cleanText) return;

    const priority = PRIORITIES[newPriority.value]
        ? newPriority.value
        : "medium";

    const task = {
        id: createId(),
        text: cleanText,
        completed: false,
        priority,
        folderId: activeFolderId,
        categoryId: activeCategoryId === "all"
            ? ""
            : activeCategoryId,
        order: 0
    };

    // Получаем все задачи текущей папки.
    const folderTasks = tasks
        .filter(item => item.folderId === activeFolderId)
        .sort((a, b) => a.order - b.order);

    // Находим место для новой задачи по приоритету.
    // Это правило действует только при создании.
    const newPriorityRank = PRIORITY_ORDER[priority];

    let insertIndex = folderTasks.findIndex(item => {
        if (item.completed) return true;

        const existingRank = PRIORITY_ORDER[item.priority] || 2;

        return existingRank > newPriorityRank;
    });

    if (insertIndex === -1) {
        insertIndex = folderTasks.length;
    }

    folderTasks.splice(insertIndex, 0, task);

    // Перенумеровываем задачи папки.
    folderTasks.forEach((item, index) => {
        item.order = index + 1;
    });

    tasks.push(task);

    saveData();
    renderTasks();
}


// ========================================
// 12. Изменение статуса задачи
// ========================================

function toggleTask(taskId) {
    const task = tasks.find(item => item.id === taskId);

    if (!task) return;

    task.completed = !task.completed;

    saveData();
    renderTasks();
}


// ========================================
// 13. Редактирование задачи
// ========================================

function editTask(taskId, newText) {
    const cleanText = newText.trim();

    if (!cleanText) return false;

    const task = tasks.find(item => item.id === taskId);

    if (!task) return false;

    task.text = cleanText;
    editingTaskId = null;

    saveData();
    renderTasks();

    return true;
}


// ========================================
// 14. Изменение приоритета
// ========================================

function updatePriority(taskId, priority) {
    if (!PRIORITIES[priority]) return;

    const task = tasks.find(item => item.id === taskId);

    if (!task) return;

    task.priority = priority;

    // Меняем только приоритет.
    // Позиция задачи остаётся прежней.

    saveData();
    renderTasks();
}


// ========================================
// 15. Удаление задачи
// ========================================

function deleteTask(taskId) {
    const index = tasks.findIndex(task => task.id === taskId);

    if (index === -1) return;

    const deletedTask = tasks[index];

    lastDeleted = {
        tasks: [deletedTask],
        indices: [index]
    };

    tasks.splice(index, 1);

    saveData();
    renderTasks();
}


// ========================================
// 16. Удаление выполненных задач
// ========================================

function clearCompletedTasks() {
    const removed = [];

    tasks.forEach((task, index) => {
        const belongsToCurrentView =
            task.folderId === activeFolderId &&
            (
                activeCategoryId === "all" ||
                task.categoryId === activeCategoryId
            );

        if (task.completed && belongsToCurrentView) {
            removed.push({ task, index });
        }
    });

    if (removed.length === 0) return;

    lastDeleted = {
        tasks: removed.map(item => item.task),
        indices: removed.map(item => item.index)
    };

    const removedIds = new Set(
        removed.map(item => item.task.id)
    );

    tasks = tasks.filter(
        task => !removedIds.has(task.id)
    );

    saveData();
    renderTasks();
}


// ========================================
// 17. Отмена последнего удаления
// ========================================

function undoDelete() {
    if (!lastDeleted || !lastDeleted.tasks.length) {
        return;
    }

    lastDeleted.tasks.forEach((task, position) => {
        const folderExists = folders.some(
            folder => folder.id === task.folderId
        );

        if (!folderExists) return;

        if (tasks.some(item => item.id === task.id)) return;

        const index = Math.min(
            lastDeleted.indices[position],
            tasks.length
        );

        tasks.splice(index, 0, task);
    });

    lastDeleted = null;

    saveData();
    renderTasks();
}


// ========================================
// 18. Перетаскивание задач
// ========================================

function reorderTask(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const sourceTask = tasks.find(task => task.id === sourceId);
    const targetTask = tasks.find(task => task.id === targetId);

    if (!sourceTask || !targetTask) return;

    if (sourceTask.folderId !== targetTask.folderId) return;

    // Все задачи папки в сохранённом порядке.
    const folderTasks = tasks
        .filter(task => task.folderId === activeFolderId)
        .sort((a, b) => a.order - b.order);

    // Задачи, которые сейчас отображаются в списке.
    const visibleGroup = getCurrentTasks()
        .sort((a, b) => a.order - b.order);

    const sourceIndex = visibleGroup.findIndex(
        task => task.id === sourceId
    );

    const targetIndex = visibleGroup.findIndex(
        task => task.id === targetId
    );

    if (sourceIndex === -1 || targetIndex === -1) return;

    // Перемещаем задачу в списке.
    const [movedTask] = visibleGroup.splice(sourceIndex, 1);

    visibleGroup.splice(targetIndex, 0, movedTask);

    // Сохраняем позиции задач, которые скрыты фильтром категории.
    const visibleIds = new Set(
        getCurrentTasks().map(task => task.id)
    );

    let visibleIndex = 0;

    const reorderedFolderTasks = folderTasks.map(task => {
        if (visibleIds.has(task.id)) {
            return visibleGroup[visibleIndex++];
        }

        return task;
    });

    // Записываем новый порядок.
    reorderedFolderTasks.forEach((task, index) => {
        task.order = index + 1;
    });

    saveData();
    renderTasks();
}


// ========================================
// 19. Поиск и фильтрация
// ========================================

function getVisibleTasks() {
    const query = searchQuery.trim().toLowerCase();

    return getCurrentTasks()
        .filter(task => {
            const matchesSearch = task.text
                .toLowerCase()
                .includes(query);

            const matchesFilter =
                currentFilter === "all" ||
                (currentFilter === "active" && !task.completed) ||
                (currentFilter === "completed" && task.completed);

            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            // Выполненные задачи остаются внизу.
            if (a.completed !== b.completed) {
                return Number(a.completed) - Number(b.completed);
            }

            // В остальном соблюдаем сохранённый порядок.
            return a.order - b.order;
        });
}


// ========================================
// 20. Создание элемента задачи
// ========================================

function createTaskElement(task, index, visibleTasks) {
    const item = document.createElement("li");

    item.className = "task-item";
    item.draggable = true;
    item.dataset.taskId = task.id;

    if (task.completed) {
        item.classList.add("completed");
    }

    // Начало перетаскивания.

    item.addEventListener("dragstart", event => {
        if (event.target.closest("button, input, select, form")) {
            event.preventDefault();
            return;
        }

        draggedTaskId = task.id;

        item.classList.add("dragging");

        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);
    });

    // Перемещение над другой задачей.

    item.addEventListener("dragover", event => {
        if (!draggedTaskId || draggedTaskId === task.id) return;

        event.preventDefault();

        event.dataTransfer.dropEffect = "move";

        item.classList.add("drag-over");
    });

    // Убираем подсветку.

    item.addEventListener("dragleave", () => {
        item.classList.remove("drag-over");
    });

    // Отпускаем задачу.

    item.addEventListener("drop", event => {
        event.preventDefault();

        item.classList.remove("drag-over");

        const sourceId = event.dataTransfer.getData("text/plain");

        reorderTask(sourceId || draggedTaskId, task.id);

        draggedTaskId = null;
    });

    // Завершение перетаскивания.

    item.addEventListener("dragend", () => {
        draggedTaskId = null;

        document.querySelectorAll(".task-item").forEach(element => {
            element.classList.remove("dragging", "drag-over");
        });
    });

    // Чекбокс.

    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;

    checkbox.setAttribute(
        "aria-label",
        `Выполнить задачу: ${task.text}`
    );

    checkbox.addEventListener("change", () => {
        toggleTask(task.id);
    });

    // Контент.

    const content = document.createElement("div");

    content.className = "task-content";

    if (editingTaskId === task.id) {
        const editForm = document.createElement("form");

        editForm.className = "edit-form";

        const input = document.createElement("input");

        input.value = task.text;
        input.maxLength = 120;
        input.required = true;

        const saveButton = document.createElement("button");

        saveButton.type = "submit";
        saveButton.textContent = "Сохранить";

        const cancelButton = document.createElement("button");

        cancelButton.type = "button";
        cancelButton.textContent = "Отмена";

        cancelButton.addEventListener("click", () => {
            editingTaskId = null;
            renderTasks();
        });

        editForm.addEventListener("submit", event => {
            event.preventDefault();

            if (!editTask(task.id, input.value)) {
                input.focus();
            }
        });

        editForm.append(input, saveButton, cancelButton);
        content.append(editForm);

        setTimeout(() => input.focus(), 0);

    } else {
        const text = document.createElement("span");

        text.className = "task-text";
        text.textContent = task.text;

        const meta = document.createElement("div");

        meta.className = "task-meta";

        const priority = document.createElement("span");

        priority.className = `chip priority-${task.priority}`;
        priority.textContent =
            `Приоритет: ${PRIORITIES[task.priority] || "Средний"}`;

        meta.append(priority);

        const folder = folders.find(
            item => item.id === task.folderId
        );

        const category = folder?.categories.find(
            item => item.id === task.categoryId
        );

        if (category) {
            const categoryChip = document.createElement("span");

            categoryChip.className = "chip";
            categoryChip.textContent = category.name;

            meta.append(categoryChip);
        }

        content.append(text, meta);
    }

    // Выпадающий список приоритета.

    const prioritySelect = document.createElement("select");

    prioritySelect.className = "task-priority";

    prioritySelect.setAttribute(
        "aria-label",
        `Приоритет задачи ${task.text}`
    );

    Object.entries(PRIORITIES).forEach(([value, label]) => {
        const option = document.createElement("option");

        option.value = value;
        option.textContent = label;
        option.selected = (task.priority || "medium") === value;

        prioritySelect.append(option);
    });

    prioritySelect.addEventListener("change", () => {
        updatePriority(task.id, prioritySelect.value);
    });

    // Кнопки управления.

    const actions = document.createElement("div");

    actions.className = "task-actions";

    function createActionButton(symbol, title, callback) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "icon-button";
        button.textContent = symbol;
        button.title = title;
        button.setAttribute("aria-label", title);

        button.addEventListener("click", callback);

        return button;
    }

    const editButton = createActionButton(
        "✎",
        "Редактировать",
        () => {
            editingTaskId = task.id;
            renderTasks();
        }
    );

    const deleteButton = createActionButton(
        "×",
        "Удалить",
        () => deleteTask(task.id)
    );

    actions.append(editButton, deleteButton);

    item.append(
        checkbox,
        content,
        prioritySelect,
        actions
    );

    return item;
}


// ========================================
// 21. Отображение списка задач
// ========================================

function renderTasks() {
    const visibleTasks = getVisibleTasks();
    const currentTasks = getCurrentTasks();

    const activeCount = currentTasks.filter(
        task => !task.completed
    ).length;

    const completedCount = currentTasks.length - activeCount;

    taskList.replaceChildren();

    visibleTasks.forEach((task, index) => {
        const element = createTaskElement(
            task,
            index,
            visibleTasks
        );

        taskList.append(element);
    });

    taskList.hidden = visibleTasks.length === 0;
    emptyState.hidden = visibleTasks.length !== 0;

    if (visibleTasks.length === 0) {
        if (searchQuery.trim()) {
            emptyTitle.textContent = "Ничего не найдено";
            emptyDescription.textContent =
                "Попробуйте изменить поисковый запрос.";

        } else if (
            currentFilter === "active" &&
            currentTasks.length > 0
        ) {
            emptyTitle.textContent = "Активных задач нет";
            emptyDescription.textContent =
                "Все задачи уже выполнены.";

        } else if (
            currentFilter === "completed" &&
            currentTasks.length > 0
        ) {
            emptyTitle.textContent = "Выполненных задач нет";
            emptyDescription.textContent =
                "Здесь появятся выполненные задачи.";

        } else {
            emptyTitle.textContent = "Пока здесь пусто";
            emptyDescription.textContent =
                "Добавьте первую задачу.";
        }
    }

    taskTotal.textContent =
        `${currentTasks.length} ${getTasksLabel(currentTasks.length)}`;

    remainingCount.textContent = activeCount
        ? `Осталось: ${activeCount} ${getTasksLabel(activeCount)}`
        : "Все задачи выполнены";

    clearButton.disabled = completedCount === 0;

    undoButton.disabled =
        !lastDeleted || lastDeleted.tasks.length === 0;
}


// ========================================
// 22. Обновление интерфейса
// ========================================

function renderAll() {
    renderWorkspace();
    renderTasks();
}


// ========================================
// 23. Переключение темы
// ========================================

function toggleTheme() {
    const isDark = document.body.classList.toggle("dark");

    try {
        localStorage.setItem(
            "todo-list-theme",
            isDark ? "dark" : "light"
        );
    } catch (error) {
        console.error("Не удалось сохранить тему:", error);
    }

    updateThemeButton(isDark);
}

function updateThemeButton(isDark) {
    themeToggle.textContent = isDark ? "☀" : "☾";
}

function loadTheme() {
    let savedTheme = "light";

    try {
        savedTheme = localStorage.getItem("todo-list-theme") || "light";
    } catch (error) {
        console.error("Не удалось загрузить тему:", error);
    }

    const isDark = savedTheme === "dark";

    document.body.classList.toggle("dark", isDark);

    updateThemeButton(isDark);
}


// ========================================
// 24. Обработчики событий
// ========================================

// Добавление задачи.

taskForm.addEventListener("submit", event => {
    event.preventDefault();

    addTask(taskInput.value);

    taskInput.value = "";
    taskInput.focus();
});


// Создание папки.

folderForm.addEventListener("submit", event => {
    event.preventDefault();

    if (createFolder(folderInput.value)) {
        folderInput.value = "";
    }
});


// Создание категории.

categoryForm.addEventListener("submit", event => {
    event.preventDefault();

    if (createCategory(categoryInput.value)) {
        categoryInput.value = "";
    }
});


// Удаление папки.

deleteFolderButton.addEventListener("click", deleteFolder);


// Удаление категории.

deleteCategoryButton.addEventListener("click", deleteCategory);


// Выбор папки.

folderSelect.addEventListener("change", () => {
    activeFolderId = folderSelect.value;
    activeCategoryId = "all";

    editingTaskId = null;

    saveData();
    renderAll();
});


// Выбор категории.

categorySelect.addEventListener("change", () => {
    activeCategoryId = categorySelect.value;

    editingTaskId = null;

    saveData();
    renderTasks();
});


// Поиск.

searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;

    renderTasks();
});


// Фильтры.

filterButtons.forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;

        filterButtons.forEach(item => {
            item.classList.toggle(
                "active",
                item === button
            );
        });

        renderTasks();
    });
});


// Удаление выполненных задач.

clearButton.addEventListener("click", clearCompletedTasks);


// Отмена удаления.

undoButton.addEventListener("click", undoDelete);


// Переключение темы.

themeToggle.addEventListener("click", toggleTheme);


// ========================================
// 25. Запуск приложения
// ========================================

loadTheme();
renderAll();
