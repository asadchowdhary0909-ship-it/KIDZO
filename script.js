"use strict";

/* =========================================================
   KID WORLD
   FINAL JAVASCRIPT
   ========================================================= */


/* =========================================================
   STORAGE
   ========================================================= */

const ACCOUNTS_KEY = "kidWorldAccounts";
const CURRENT_ACCOUNT_KEY = "kidWorldCurrentUID";

/* =========================================================
   REAL-TIME KID WORLD DATA
   ========================================================= */
const FIREBASE_DB_URL =
    "https://chrono-fa677-default-rtdb.firebaseio.com";

const PRESENCE_TIMEOUT_MS = 15000;
const PRESENCE_HEARTBEAT_MS = 5000;
const CHAT_POLL_MS = 2000;

let presenceTimer = null;
let realtimeTimer = null;
let lastRenderedChatSignature = "";


/* =========================================================
   AVATARS
   ========================================================= */

const emojis = [
    "😊",
    "🦊",
    "🐼",
    "🐸",
    "🐯",
    "🐨",
    "🦄",
    "🐙"
];


/* =========================================================
   SUBSCRIPTIONS
   ========================================================= */

const SUBSCRIPTIONS = {

    FREE: {
        name: "FREE",
        price: 0,
        dailyCoins: 0,
        videoDiscount: 0,
        icon: "🆓"
    },

    PRO: {
        name: "PRO",
        price: 5000,
        dailyCoins: 500,
        videoDiscount: 50,
        icon: "🔵"
    },

    ELITE: {
        name: "ELITE",
        price: 8000,
        dailyCoins: 750,
        videoDiscount: 100,
        icon: "👑"
    },

    PREMIUM: {
        name: "PREMIUM",
        price: 12000,
        dailyCoins: 400,
        videoDiscount: 200,
        icon: "💜"
    }

};


/* =========================================================
   STATE
   ========================================================= */

let accounts = loadAccounts();

let currentAccount = null;

let balance = 500;

let transactions = [];

let creatingNewAccount = false;


/* =========================================================
   ELEMENTS
   ========================================================= */

const welcomeScreen =
    document.getElementById("welcomeScreen");

const worldScreen =
    document.getElementById("worldScreen");

const nameInput =
    document.getElementById("nameInput");

const enterWorldBtn =
    document.getElementById("enterWorldBtn");

const errorMessage =
    document.getElementById("errorMessage");

const playerName =
    document.getElementById("playerName");

const welcomeName =
    document.getElementById("welcomeName");

const playerUid =
    document.getElementById("playerUid");

const avatar =
    document.getElementById("avatar");

const balanceElement =
    document.getElementById("balance");

const walletBalance =
    document.getElementById("walletBalance");

const accountButton =
    document.getElementById("accountButton");

const accountModal =
    document.getElementById("accountModal");

const closeModal =
    document.getElementById("closeModal");

const newAccountBtn =
    document.getElementById("newAccountBtn");

const deleteAccountBtn =
    document.getElementById("deleteAccountBtn");

const logoutBtn =
    document.getElementById("logoutBtn");

const accountList =
    document.getElementById("accountList");

const startGameBtn =
    document.getElementById("startGameBtn");

const gameArea =
    document.getElementById("gameArea");

const gameBird =
    document.getElementById("gameBird");

const gameScore =
    document.getElementById("gameScore");

const gameText =
    document.getElementById("gameText");

const pipeTop =
    document.getElementById("pipeTop");

const pipeBottom =
    document.getElementById("pipeBottom");

const chatInput =
    document.getElementById("chatInput");

const sendMessageBtn =
    document.getElementById("sendMessageBtn");


/* =========================================================
   ACCOUNT LOADING
   ========================================================= */

function loadAccounts() {

    try {

        const saved =
            localStorage.getItem(ACCOUNTS_KEY);

        if (!saved) {
            return [];
        }

        const parsed =
            JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return [];
        }

        const cleanAccounts = [];

        const usedUIDs = new Set();

        const usedNames = new Set();

        parsed.forEach(account => {

            if (
                !account ||
                typeof account !== "object"
            ) {
                return;
            }

            if (
                typeof account.uid !== "string" ||
                typeof account.name !== "string"
            ) {
                return;
            }

            const name =
                account.name.trim();

            if (!name) {
                return;
            }

            const nameKey =
                name.toLowerCase();

            if (usedUIDs.has(account.uid)) {
                return;
            }

            if (usedNames.has(nameKey)) {
                return;
            }

            usedUIDs.add(account.uid);
            usedNames.add(nameKey);

            cleanAccounts.push({

                uid: account.uid,

                name: name,

                emoji:
                    typeof account.emoji === "string"
                        ? account.emoji
                        : emojis[0],

                balance:
                    Number.isFinite(Number(account.balance))
                        ? (
                            Number(account.balance) === 5100 &&
                            Array.isArray(account.transactions) &&
                            account.transactions.some(
                                transaction =>
                                    Number(transaction && transaction.amount) === 5100 &&
                                    /welcome bonus/i.test(
                                        String(
                                            transaction &&
                                            transaction.text ||
                                            ""
                                        )
                                    )
                            )
                                ? 500
                                : Number(account.balance)
                        )
                        : 500,

                transactions:
                    Array.isArray(account.transactions)
                        ? account.transactions.map(transaction => {
                            const copy =
                                transaction && typeof transaction === "object"
                                    ? { ...transaction }
                                    : { text: "Activity", amount: 0 };

                            if (
                                Number(copy.amount) === 5100 &&
                                /welcome bonus/i.test(String(copy.text || ""))
                            ) {
                                copy.amount = 500;
                            }

                            return copy;
                        })
                        : [],

                unlockedVideos:
                    Array.isArray(account.unlockedVideos)
                        ? account.unlockedVideos
                        : [],

                subscription:
                    normalizeSubscription(
                        account.subscription
                    ),

                subscriptionLastDailyClaim:
                    account.subscriptionLastDailyClaim ||
                    null

            });

        });

        return cleanAccounts;

    } catch (error) {

        console.error(
            "KID WORLD: Could not load accounts.",
            error
        );

        return [];

    }

}


/* =========================================================
   SAVE
   ========================================================= */

function saveAccounts() {

    try {

        localStorage.setItem(
            ACCOUNTS_KEY,
            JSON.stringify(accounts)
        );

    } catch (error) {

        console.error(
            "KID WORLD: Could not save accounts.",
            error
        );

    }

}


/* =========================================================
   UID
   ========================================================= */

function generateUID() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let uid;

    do {

        uid = "KID-";

        for (let i = 0; i < 6; i++) {

            uid +=
                characters[
                    Math.floor(
                        Math.random() *
                        characters.length
                    )
                ];

        }

    } while (
        accounts.some(
            account => account.uid === uid
        )
    );

    return uid;

}


/* =========================================================
   ERROR
   ========================================================= */

function showError(message) {

    if (errorMessage) {
        errorMessage.textContent = message;
    }

}

function clearError() {

    if (errorMessage) {
        errorMessage.textContent = "";
    }

}


/* =========================================================
   SUBSCRIPTION HELPERS
   ========================================================= */

function normalizeSubscription(value) {

    const key =
        String(value || "FREE")
            .toUpperCase();

    return SUBSCRIPTIONS[key]
        ? key
        : "FREE";

}


function getSubscription() {

    if (!currentAccount) {
        return "FREE";
    }

    return normalizeSubscription(
        currentAccount.subscription
    );

}


function getSubscriptionInfo() {

    return SUBSCRIPTIONS[
        getSubscription()
    ];

}


function getDiscountedVideoCost(baseCost) {

    const info =
        getSubscriptionInfo();

    return Math.max(
        0,
        Number(baseCost || 0) -
        info.videoDiscount
    );

}


function todayKey() {

    const date = new Date();

    return (
        date.getFullYear() +
        "-" +
        String(
            date.getMonth() + 1
        ).padStart(2, "0") +
        "-" +
        String(
            date.getDate()
        ).padStart(2, "0")
    );

}


/* =========================================================
   THEME
   ========================================================= */

function applySubscriptionTheme() {

    const tier =
        getSubscription()
            .toLowerCase();

    document.body.classList.remove(
        "theme-free",
        "theme-pro",
        "theme-elite",
        "theme-premium"
    );

    document.body.classList.add(
        "theme-" + tier
    );

}


/* =========================================================
   PROFILE
   ========================================================= */

function updateProfile() {

    if (!currentAccount) {
        return;
    }

    if (playerName) {
        playerName.textContent =
            currentAccount.name;
    }

    if (welcomeName) {
        welcomeName.textContent =
            currentAccount.name;
    }

    if (playerUid) {
        playerUid.textContent =
            "UID: " +
            currentAccount.uid;
    }

    if (avatar) {
        avatar.textContent =
            currentAccount.emoji;
    }

    applySubscriptionAvatarEffect();

    updateBalance();

    updateTransactions();

}


/* =========================================================
   AVATAR EFFECT
   ========================================================= */

function applySubscriptionAvatarEffect() {

    if (!avatar) {
        return;
    }

    avatar.classList.remove(
        "kidworld-pro-avatar",
        "kidworld-elite-avatar",
        "kidworld-premium-avatar"
    );

    const tier =
        getSubscription();

    if (tier === "PRO") {
        avatar.classList.add(
            "kidworld-pro-avatar"
        );
    }

    if (tier === "ELITE") {
        avatar.classList.add(
            "kidworld-elite-avatar"
        );
    }

    if (tier === "PREMIUM") {
        avatar.classList.add(
            "kidworld-premium-avatar"
        );
    }

}


/* =========================================================
   BALANCE
   ========================================================= */

function updateBalance() {

    if (balanceElement) {
        balanceElement.textContent =
            balance;
    }

    if (walletBalance) {
        walletBalance.textContent =
            balance;
    }

}


/* =========================================================
   COINS
   ========================================================= */

function addCoins(amount, reason) {

    if (!currentAccount) {
        return;
    }

    const value =
        Number(amount);

    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {
        return;
    }

    balance += value;

    transactions.unshift({

        text: String(reason),

        amount: value

    });

    currentAccount.balance =
        balance;

    currentAccount.transactions =
        transactions;

    saveAccounts();

    updateBalance();

    updateTransactions();

}


function spendCoins(amount, reason) {

    if (!currentAccount) {

        alert(
            "Please login first."
        );

        return false;
    }

    const value =
        Number(amount);

    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {
        return false;
    }

    if (balance < value) {

        alert(
            "You don't have enough PlayCoins! 🪙"
        );

        return false;
    }

    balance -= value;

    transactions.unshift({

        text: String(reason),

        amount: -value

    });

    currentAccount.balance =
        balance;

    currentAccount.transactions =
        transactions;

    saveAccounts();

    updateBalance();

    updateTransactions();

    return true;

}


/* =========================================================
   TRANSACTIONS
   ========================================================= */

function updateTransactions() {

    const list =
        document.getElementById(
            "transactionList"
        );

    if (!list) {
        return;
    }

    list.innerHTML = "";

    const renderTransaction = transaction => {

        const div =
            document.createElement("div");

        div.className =
            "transaction";

        const amount =
            Number(transaction.amount);

        const safeAmount =
            Number.isFinite(amount)
                ? amount
                : 0;

        const display =
            safeAmount >= 0
                ? "+" + safeAmount
                : String(safeAmount);

        const text =
            document.createElement("span");

        text.textContent =
            transaction.text ||
            "Activity";

        const value =
            document.createElement("strong");

        value.textContent =
            display + " 🪙";

        div.appendChild(text);
        div.appendChild(value);

        return div;
    };

    if (!transactions.length) {

        const empty =
            document.createElement("div");

        empty.className =
            "transaction";

        empty.innerHTML =
            "<span>No activity yet.</span><strong>🪙 0</strong>";

        list.appendChild(empty);

    } else {

        transactions
            .slice(0, 10)
            .forEach(transaction => {
                list.appendChild(
                    renderTransaction(transaction)
                );
            });

    }

    if (allTransactionList) {

        allTransactionList.innerHTML = "";

        transactions.forEach(transaction => {
            allTransactionList.appendChild(
                renderTransaction(transaction)
            );
        });

    }

}


/* =========================================================
   ENTER WORLD
   ========================================================= */


if (enterWorldBtn) {

    enterWorldBtn.addEventListener(
        "click",
        enterWorld
    );

}


if (nameInput) {

    nameInput.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                enterWorld();

            }

        }
    );

}


function enterWorld() {

    if (!nameInput) {
        return;
    }

    const name =
        nameInput.value.trim();

    if (name.length < 2) {

        showError(
            "Please enter a nickname with at least 2 characters."
        );

        return;
    }

    if (name.length > 16) {

        showError(
            "Your nickname must be 16 characters or less."
        );

        return;
    }

    clearError();

    const existing =
        accounts.find(
            account =>
                account.name
                    .toLowerCase() ===
                name.toLowerCase()
        );

    if (creatingNewAccount) {

        if (existing) {

            showError(
                "That nickname already exists. Choose another nickname."
            );

            return;
        }

        createAccount(name);

        return;
    }

    if (existing) {

        loginAccount(existing);

    } else {

        createAccount(name);

    }

}


/* =========================================================
   CREATE ACCOUNT
   ========================================================= */

function createAccount(name) {

    const duplicate =
        accounts.find(
            account =>
                account.name
                    .toLowerCase() ===
                name.toLowerCase()
        );

    if (duplicate) {

        showError(
            "That nickname is already in use."
        );

        return;
    }

    const account = {

        uid: generateUID(),

        name: name.trim(),

        emoji:
            emojis[
                Math.floor(
                    Math.random() *
                    emojis.length
                )
            ],

        balance: 500,

        transactions: [

            {
                text: "🎁 Welcome bonus",
                amount: 500
            }

        ],

        unlockedVideos: [],

        subscription: "FREE",

        subscriptionLastDailyClaim: null

    };

    accounts.push(account);

    saveAccounts();

    creatingNewAccount = false;

    loginAccount(account);

}


/* =========================================================
   LOGIN
   ========================================================= */

function loginAccount(account) {

    if (!account) {
        return;
    }

    stopGame();

    if (!Array.isArray(account.transactions)) {
        account.transactions = [];
    }

    if (!Array.isArray(account.unlockedVideos)) {
        account.unlockedVideos = [];
    }

    account.subscription =
        normalizeSubscription(
            account.subscription
        );

    const numericBalance =
        Number(account.balance);

    account.balance =
        Number.isFinite(numericBalance)
            ? numericBalance
            : 500;

    currentAccount = account;

    balance =
        account.balance;

    transactions =
        account.transactions;

    localStorage.setItem(
        CURRENT_ACCOUNT_KEY,
        account.uid
    );

    saveAccounts();

    creatingNewAccount = false;

    if (welcomeScreen) {
        welcomeScreen.classList.add(
            "hidden"
        );
    }

    if (worldScreen) {
        worldScreen.classList.remove(
            "hidden"
        );
    }

    updateProfile();

    resetVideoCards();

    restoreUnlockedVideos();
    updateVideoPrices();

    applySubscriptionTheme();

    claimSubscriptionDailyReward();

    renderSubscriptionPage();

    showPage("home");

    startRealtimeServices();

}


/* =========================================================
   AUTO LOGIN
   ========================================================= */

function autoLogin() {

    const savedUID =
        localStorage.getItem(
            CURRENT_ACCOUNT_KEY
        );

    if (!savedUID) {

        showWelcomeScreen();

        applySubscriptionTheme();

        return;
    }

    const savedAccount =
        accounts.find(
            account =>
                account.uid === savedUID
        );

    if (!savedAccount) {

        localStorage.removeItem(
            CURRENT_ACCOUNT_KEY
        );

        showWelcomeScreen();

        return;
    }

    loginAccount(savedAccount);

}


/* =========================================================
   WELCOME SCREEN
   ========================================================= */

function showWelcomeScreen() {

    stopGame();
    stopRealtimeServices();

    if (worldScreen) {
        worldScreen.classList.add(
            "hidden"
        );
    }

    if (welcomeScreen) {
        welcomeScreen.classList.remove(
            "hidden"
        );
    }

    document.body.classList.remove(
        "theme-pro",
        "theme-elite",
        "theme-premium"
    );

    document.body.classList.add(
        "theme-free"
    );

}


/* =========================================================
   NAVIGATION
   ========================================================= */

document
    .querySelectorAll(".nav-button")
    .forEach(button => {

        button.addEventListener(
            "click",
            function () {

                const page =
                    this.dataset.page;

                if (!page) {
                    return;
                }

                showPage(page);

            }
        );

    });


function showPage(page) {

    document
        .querySelectorAll(".page")
        .forEach(section => {

            section.classList.add(
                "hidden"
            );

        });

    const selected =
        document.getElementById(
            page + "Page"
        );

    if (selected) {

        selected.classList.remove(
            "hidden"
        );

    }

    document
        .querySelectorAll(".nav-button")
        .forEach(button => {

            button.classList.remove(
                "active"
            );

            if (
                button.dataset.page ===
                page
            ) {

                button.classList.add(
                    "active"
                );

            }

        });

    if (page === "subscriptions") {
        renderSubscriptionPage();
    }

}


/* =========================================================
   FLAPPY BIRD
   ========================================================= */

let gameRunning = false;

let score = 0;

let birdY = 120;

let velocity = 0;

let pipeX = 0;

let gapY = 100;

let pipePassed = false;

let gameLoop = null;

const GRAVITY = 0.45;

const FLAP_POWER = -7;

const PIPE_SPEED = 3;

const PIPE_WIDTH = 60;

const PIPE_GAP = 110;

const BIRD_LEFT = 80;

const BIRD_SIZE = 35;


function getGameWidth() {

    if (!gameArea) {
        return 600;
    }

    return gameArea.clientWidth || 600;

}


function getGameHeight() {

    if (!gameArea) {
        return 300;
    }

    return gameArea.clientHeight || 300;

}


/* =========================================================
   GAME START
   ========================================================= */

if (startGameBtn) {

    startGameBtn.addEventListener(
        "click",
        startGame
    );

}


function startGame() {

    if (
        !gameArea ||
        !gameBird ||
        !pipeTop ||
        !pipeBottom
    ) {
        return;
    }

    stopGame();

    gameRunning = true;

    score = 0;

    birdY = 120;

    velocity = 0;

    pipePassed = false;

    gameArea.classList.remove(
        "hidden"
    );

    gameBird.style.left =
        BIRD_LEFT + "px";

    gameBird.style.top =
        birdY + "px";

    gameScore.textContent = "0";

    gameText.textContent =
        "CLICK / TAP / SPACE TO FLY!";

    createPipe();

    startGameBtn.disabled = true;

    startGameBtn.textContent =
        "PLAYING... 🐦";

    gameLoop =
        setInterval(
            updateGame,
            20
        );

}


/* =========================================================
   STOP GAME
   ========================================================= */

function stopGame() {

    gameRunning = false;

    if (gameLoop !== null) {

        clearInterval(
            gameLoop
        );

        gameLoop = null;

    }

    if (startGameBtn) {

        startGameBtn.disabled = false;

        startGameBtn.textContent =
            "START GAME 🐦";

    }

}


/* =========================================================
   FLAP
   ========================================================= */

function flap() {

    if (!gameRunning) {
        return;
    }

    velocity =
        FLAP_POWER;

}


/* =========================================================
   GAME CONTROLS
   ========================================================= */

if (gameArea) {

    gameArea.addEventListener(
        "pointerdown",
        event => {

            event.preventDefault();

            flap();

        }
    );

}


document.addEventListener(
    "keydown",
    event => {

        if (
            event.code === "Space" &&
            gameRunning
        ) {

            event.preventDefault();

            flap();

        }

    }
);


/* =========================================================
   CREATE PIPE
   ========================================================= */

function createPipe() {

    if (
        !pipeTop ||
        !pipeBottom
    ) {
        return;
    }

    const height =
        getGameHeight();

    const width =
        getGameWidth();

    pipeX =
        width;

    const minimum =
        60;

    const maximum =
        Math.max(
            minimum,
            height -
            PIPE_GAP -
            60
        );

    gapY =
        Math.floor(
            Math.random() *
            (maximum - minimum + 1)
        ) +
        minimum;

    const bottomHeight =
        Math.max(
            40,
            height -
            gapY -
            PIPE_GAP
        );

    pipeTop.style.left =
        pipeX + "px";

    pipeBottom.style.left =
        pipeX + "px";

    pipeTop.style.height =
        gapY + "px";

    pipeBottom.style.height =
        bottomHeight + "px";

    pipePassed = false;

    pipeTop.style.display =
        "block";

    pipeBottom.style.display =
        "block";

}


/* =========================================================
   UPDATE GAME
   ========================================================= */

function updateGame() {

    if (
        !gameRunning ||
        !gameBird ||
        !pipeTop ||
        !pipeBottom
    ) {
        return;
    }

    const height =
        getGameHeight();

    velocity += GRAVITY;

    birdY += velocity;

    gameBird.style.top =
        birdY + "px";

    pipeX -= PIPE_SPEED;

    pipeTop.style.left =
        pipeX + "px";

    pipeBottom.style.left =
        pipeX + "px";


    /* SCORE */

    if (
        !pipePassed &&
        pipeX + PIPE_WIDTH <
        BIRD_LEFT
    ) {

        score++;

        pipePassed = true;

        if (gameScore) {
            gameScore.textContent =
                String(
                    getDisplayGameScore(
                        score
                    )
                );
        }

    }


    /* NEXT PIPE */

    if (
        pipeX <
        -PIPE_WIDTH
    ) {

        createPipe();

    }


    /* COLLISION */

    const birdTop =
        birdY;

    const birdBottom =
        birdY +
        BIRD_SIZE;

    const birdRight =
        BIRD_LEFT +
        BIRD_SIZE;

    const pipeRight =
        pipeX +
        PIPE_WIDTH;

    const hitsPipeX =
        birdRight > pipeX &&
        BIRD_LEFT < pipeRight;

    const hitsTop =
        birdTop < gapY;

    const bottomTop =
        gapY +
        PIPE_GAP;

    const hitsBottom =
        birdBottom >
        bottomTop;

    const hitsCeiling =
        birdTop <= 0;

    const hitsGround =
        birdBottom >= height;

    if (
        hitsCeiling ||
        hitsGround ||
        (
            hitsPipeX &&
            (
                hitsTop ||
                hitsBottom
            )
        )
    ) {

        endGame();

    }

}


/* =========================================================
   GAME SCORE MULTIPLIER
   ========================================================= */

function getDisplayGameScore(baseScore) {

    const base =
        Math.max(
            0,
            Number(baseScore) || 0
        );

    /*
       Game score is always:
       1 pipe = 10
       2 pipes = 20
       3 pipes = 30
       etc.
    */
    return base * 10;

}

function getFlappyReward(baseScore) {

    const normalReward =
        getDisplayGameScore(baseScore);

    const tier =
        getSubscription();

    /* ELITE and PREMIUM double the PlayCoin reward. */
    if (
        tier === "ELITE" ||
        tier === "PREMIUM"
    ) {
        return normalReward * 2;
    }

    return normalReward;

}


/* =========================================================
   GAME OVER
   ========================================================= */

function endGame() {

    if (!gameRunning) {
        return;
    }

    gameRunning = false;

    if (gameLoop !== null) {

        clearInterval(
            gameLoop
        );

        gameLoop = null;

    }

    if (startGameBtn) {

        startGameBtn.disabled =
            false;

        startGameBtn.textContent =
            "PLAY AGAIN 🐦";

    }

    if (gameText) {

        gameText.textContent =
            "GAME OVER! Score: " +
            getDisplayGameScore(score);

    }

    if (score > 0) {

        const reward =
            getFlappyReward(score);

        addCoins(
            reward,
            "🐦 Flappy Bird: " +
            score +
            " pipe" +
            (score === 1 ? "" : "s") +
            " = " +
            reward +
            " PlayCoins"
        );

    }

}


/* =========================================================
   VIDEO SHOP
   ========================================================= */

document
    .querySelectorAll(".unlock-video-btn")
    .forEach(button => {

        button.addEventListener(
            "click",
            function () {

                const baseCost =
                    Number(
                        this.dataset.cost ||
                        100
                    );

                const cost =
                    getDiscountedVideoCost(
                        baseCost
                    );

                unlockVideo(
                    this,
                    cost
                );

            }
        );

    });


function unlockVideo(button, cost) {

    if (!currentAccount) {

        alert(
            "Please login first."
        );

        return;
    }

    const card =
        button.closest(
            ".video-card"
        );

    if (!card) {
        return;
    }

    const player =
        card.querySelector(
            ".video-player"
        );

    if (!player) {
        return;
    }

    const videoId =
        player.dataset.videoId;

    if (!videoId) {

        alert(
            "Video ID is missing."
        );

        return;
    }

    if (
        currentAccount.unlockedVideos
            .includes(videoId)
    ) {

        playUnlockedVideo(
            player,
            videoId
        );

        button.textContent =
            "✅ Unlocked";

        button.disabled = true;

        return;
    }

    const success =
        spendCoins(
            cost,
            "🔓 Unlocked a Video"
        );

    if (!success) {
        return;
    }

    currentAccount.unlockedVideos
        .push(videoId);

    saveAccounts();

    if (
        getSubscription() ===
        "ELITE"
    ) {

        addCoins(
            100,
            "👑 ELITE video purchase bonus"
        );

    } else if (
        getSubscription() ===
        "PREMIUM"
    ) {

        addCoins(
            100,
            "💜 PREMIUM video purchase bonus"
        );

    }

    playUnlockedVideo(
        player,
        videoId
    );

    button.textContent =
        "✅ Unlocked";

    button.disabled = true;

}


/* =========================================================
   YOUTUBE
   ========================================================= */

function playUnlockedVideo(
    player,
    videoId
) {

    if (!player || !videoId) {
        return;
    }

    player.classList.remove(
        "locked-video"
    );

    player.innerHTML = "";

    const iframe =
        document.createElement(
            "iframe"
        );

    iframe.src =
        "https://www.youtube.com/embed/" +
        encodeURIComponent(videoId);

    iframe.title =
        "KID WORLD Kids Video";

    iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

    iframe.referrerPolicy =
        "strict-origin-when-cross-origin";

    iframe.allowFullscreen =
        true;

    player.appendChild(
        iframe
    );

}


/* =========================================================
   RESET VIDEOS
   ========================================================= */

function resetVideoCards() {

    document
        .querySelectorAll(".video-card")
        .forEach(card => {

            const player =
                card.querySelector(
                    ".video-player"
                );

            const button =
                card.querySelector(
                    ".unlock-video-btn"
                );

            if (!player) {
                return;
            }

            const videoId =
                player.dataset.videoId;

            player.innerHTML =
                '<div class="video-image">🔒</div>';

            player.classList.add(
                "locked-video"
            );

            player.dataset.videoId =
                videoId;

            if (button) {

                button.disabled =
                    false;

                button.textContent =
                    "🔓 UNLOCK";

            }

        });

}


/* =========================================================
   VIDEO PRICES
   ========================================================= */

function updateVideoPrices() {

    document
        .querySelectorAll(".video-card")
        .forEach(card => {

            const button =
                card.querySelector(
                    ".unlock-video-btn"
                );

            const price =
                card.querySelector(
                    ".video-price"
                );

            if (!button || !price) {
                return;
            }

            const baseCost =
                Number(
                    button.dataset.cost || 0
                );

            price.textContent =
                getDiscountedVideoCost(
                    baseCost
                );

        });

}


/* =========================================================
   RESTORE VIDEOS
   ========================================================= */

function restoreUnlockedVideos() {

    if (!currentAccount) {
        return;
    }

    const unlocked =
        Array.isArray(
            currentAccount.unlockedVideos
        )
            ? currentAccount.unlockedVideos
            : [];

    document
        .querySelectorAll(".video-card")
        .forEach(card => {

            const player =
                card.querySelector(
                    ".video-player"
                );

            const button =
                card.querySelector(
                    ".unlock-video-btn"
                );

            if (!player) {
                return;
            }

            const videoId =
                player.dataset.videoId;

            if (
                videoId &&
                unlocked.includes(videoId)
            ) {

                playUnlockedVideo(
                    player,
                    videoId
                );

                if (button) {

                    button.textContent =
                        "✅ Unlocked";

                    button.disabled =
                        true;

                }

            }

        });

}


/* =========================================================
   ALL WALLET HISTORY
   ========================================================= */

if (allHistoryBtn) {
    allHistoryBtn.addEventListener("click", () => {

        const isHidden =
            allTransactionList &&
            allTransactionList.classList.contains("hidden");

        if (allTransactionList) {
            allTransactionList.classList.toggle(
                "hidden",
                !isHidden
            );
        }

        allHistoryBtn.textContent =
            isHidden
                ? "HIDE FULL HISTORY ↑"
                : "VIEW ALL HISTORY →";

    });
}


/* =========================================================
   CHAT
   ========================================================= */

if (sendMessageBtn) {

    sendMessageBtn.addEventListener(
        "click",
        sendMessage
    );

}


if (chatInput) {

    chatInput.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                event.preventDefault();

                sendMessage();

            }

        }
    );

}


function sendMessage() {

    if (!currentAccount) {
        alert("Please login first.");
        return;
    }

    if (!chatInput) {
        return;
    }

    const text =
        chatInput.value.trim();

    if (!text) {
        return;
    }

    const payload = {
        uid: currentAccount.uid,
        name: currentAccount.name,
        emoji: currentAccount.emoji,
        text: text,
        timestamp: Date.now()
    };

    firebaseWrite(
        "chatMessages",
        payload,
        true
    )
    .then(() => {
        chatInput.value = "";
        loadRealtimeChat(true);
    })
    .catch(error => {
        console.error(
            "KID WORLD: Chat send failed.",
            error
        );

        alert(
            "Chat is temporarily unavailable. Please check the Firebase database rules."
        );
    });

}


/* =========================================================
   FIREBASE REAL-TIME DATA
   ========================================================= */

function firebaseURL(path) {

    return (
        FIREBASE_DB_URL +
        "/" +
        path
            .split("/")
            .filter(Boolean)
            .map(part => encodeURIComponent(part))
            .join("/") +
        ".json"
    );

}

async function firebaseRequest(
    path,
    options = {}
) {

    const response =
        await fetch(
            firebaseURL(path),
            {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    ...(options.headers || {})
                }
            }
        );

    if (!response.ok) {
        throw new Error(
            "Firebase HTTP " +
            response.status
        );
    }

    return response.json();

}

async function firebaseWrite(
    path,
    value,
    createChild = false
) {

    return firebaseRequest(
        path,
        {
            method:
                createChild
                    ? "POST"
                    : "PUT",
            body:
                JSON.stringify(value)
        }
    );

}

async function updatePresence() {

    if (!currentAccount) {
        return;
    }

    try {

        await firebaseRequest(
            "presence/" +
            encodeURIComponent(
                currentAccount.uid
            ),
            {
                method: "PUT",
                body: JSON.stringify({
                    uid: currentAccount.uid,
                    name: currentAccount.name,
                    emoji: currentAccount.emoji,
                    lastSeen: Date.now()
                })
            }
        );

    } catch (error) {

        console.warn(
            "KID WORLD: Presence unavailable.",
            error
        );

    }

}

async function loadRealtimePlayers() {

    if (!playerList) {
        return;
    }

    try {

        const data =
            await firebaseRequest(
                "presence"
            );

        const now =
            Date.now();

        const players =
            Object.values(data || {})
                .filter(
                    player =>
                        player &&
                        typeof player.uid === "string" &&
                        typeof player.name === "string"
                )
                .sort(
                    (a, b) =>
                        String(a.name).localeCompare(
                            String(b.name)
                        )
                );

        playerList.innerHTML = "";

        if (!players.length) {

            const empty =
                document.createElement("div");

            empty.className =
                "player-empty";

            empty.textContent =
                "No players have joined yet.";

            playerList.appendChild(empty);

            return;
        }

        players.forEach(player => {

            const wrapper =
                document.createElement("div");

            wrapper.className =
                "player";

            const avatarBox =
                document.createElement("div");

            avatarBox.className =
                "avatar blue-avatar";

            avatarBox.textContent =
                player.emoji || "😊";

            const info =
                document.createElement("div");

            const name =
                document.createElement("strong");

            name.textContent =
                player.name;

            const uid =
                document.createElement("small");

            uid.textContent =
                "UID: " + player.uid;

            info.appendChild(name);
            info.appendChild(uid);

            const status =
                document.createElement("span");

            const online =
                Number(player.lastSeen) >
                now - PRESENCE_TIMEOUT_MS;

            status.textContent =
                online ? "🟢" : "⚪";

            status.title =
                online ? "Online" : "Offline";

            wrapper.appendChild(avatarBox);
            wrapper.appendChild(info);
            wrapper.appendChild(status);

            playerList.appendChild(wrapper);

        });

    } catch (error) {

        console.warn(
            "KID WORLD: Player list unavailable.",
            error
        );

        playerList.innerHTML = "";

        const errorBox =
            document.createElement("div");

        errorBox.className =
            "player-empty";

        errorBox.textContent =
            "Player status is temporarily unavailable.";

        playerList.appendChild(errorBox);

    }

}

async function loadRealtimeChat(force = false) {

    const messages =
        document.getElementById("messages");

    if (!messages) {
        return;
    }

    try {

        const data =
            await firebaseRequest(
                "chatMessages"
            );

        const entries =
            Object.entries(data || {})
                .filter(
                    ([, message]) =>
                        message &&
                        typeof message.text === "string"
                )
                .sort(
                    ([, a], [, b]) =>
                        Number(a.timestamp || 0) -
                        Number(b.timestamp || 0)
                )
                .slice(-100);

        const signature =
            entries
                .map(
                    ([key, message]) =>
                        key +
                        ":" +
                        String(message.timestamp || "")
                )
                .join("|");

        if (
            !force &&
            signature === lastRenderedChatSignature
        ) {
            return;
        }

        lastRenderedChatSignature =
            signature;

        messages.innerHTML = "";

        if (!entries.length) {

            const empty =
                document.createElement("div");

            empty.className =
                "message";

            const text =
                document.createElement("p");

            text.textContent =
                "No messages yet. Start the conversation! 🚀";

            empty.appendChild(text);
            messages.appendChild(empty);

        } else {

            entries.forEach(
                ([, message]) => {

                    const item =
                        document.createElement("div");

                    item.className =
                        "message";

                    const name =
                        document.createElement("strong");

                    name.textContent =
                        (message.emoji || "😊") +
                        " " +
                        (message.name || "Player");

                    const paragraph =
                        document.createElement("p");

                    paragraph.textContent =
                        message.text;

                    item.appendChild(name);
                    item.appendChild(paragraph);

                    messages.appendChild(item);

                }
            );

        }

        messages.scrollTop =
            messages.scrollHeight;

    } catch (error) {

        console.warn(
            "KID WORLD: Chat load failed.",
            error
        );

        if (!messages.children.length) {

            const errorBox =
                document.createElement("div");

            errorBox.className =
                "message";

            const text =
                document.createElement("p");

            text.textContent =
                "Live chat is temporarily unavailable.";

            errorBox.appendChild(text);
            messages.appendChild(errorBox);

        }

    }

}

function startRealtimeServices() {

    if (presenceTimer) {
        clearInterval(presenceTimer);
    }

    if (realtimeTimer) {
        clearInterval(realtimeTimer);
    }

    if (!currentAccount) {
        return;
    }

    updatePresence();
    loadRealtimePlayers();
    loadRealtimeChat();

    presenceTimer =
        setInterval(
            updatePresence,
            PRESENCE_HEARTBEAT_MS
        );

    realtimeTimer =
        setInterval(
            () => {
                loadRealtimePlayers();
                loadRealtimeChat();
            },
            CHAT_POLL_MS
        );

}

function stopRealtimeServices() {

    if (presenceTimer) {
        clearInterval(presenceTimer);
        presenceTimer = null;
    }

    if (realtimeTimer) {
        clearInterval(realtimeTimer);
        realtimeTimer = null;
    }

}


/* =========================================================
   ACCOUNTS MODAL
   ========================================================= */

if (accountButton) {

    accountButton.addEventListener(
        "click",
        openAccounts
    );

}


if (closeModal) {

    closeModal.addEventListener(
        "click",
        closeAccounts
    );

}


if (accountModal) {

    accountModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                accountModal
            ) {

                closeAccounts();

            }

        }
    );

}


function openAccounts() {

    if (!accountModal) {
        return;
    }

    renderAccounts();

    accountModal.classList.remove(
        "hidden"
    );

}


function closeAccounts() {

    if (!accountModal) {
        return;
    }

    accountModal.classList.add(
        "hidden"
    );

}


/* =========================================================
   RENDER ACCOUNTS
   ========================================================= */

function renderAccounts() {

    if (!accountList) {
        return;
    }

    accountList.innerHTML = "";

    if (!accounts.length) {

        accountList.innerHTML =
            "<p>No accounts yet.</p>";

        return;
    }

    accounts.forEach(account => {

        const item =
            document.createElement(
                "div"
            );

        item.className =
            "account-item";

        const isCurrent =
            currentAccount &&
            currentAccount.uid ===
            account.uid;

        if (isCurrent) {

            item.classList.add(
                "current-account"
            );

        }

        const strong =
            document.createElement(
                "strong"
            );

        strong.textContent =
            account.emoji +
            " " +
            account.name +
            (
                isCurrent
                    ? " ⭐"
                    : ""
            );

        const small =
            document.createElement(
                "small"
            );

        small.textContent =
            "UID: " +
            account.uid +
            " • 🪙 " +
            Number(
                account.balance
            );

        item.appendChild(
            strong
        );

        item.appendChild(
            document.createElement(
                "br"
            )
        );

        item.appendChild(
            small
        );

        item.addEventListener(
            "click",
            () => {

                loginAccount(
                    account
                );

                closeAccounts();

            }
        );

        accountList.appendChild(
            item
        );

    });

}


/* =========================================================
   CREATE NEW ACCOUNT
   ========================================================= */

if (newAccountBtn) {

    newAccountBtn.addEventListener(
        "click",
        createNewAccountMode
    );

}


function createNewAccountMode() {

    closeAccounts();

    stopGame();

    currentAccount = null;

    balance = 500;

    transactions = [];

    localStorage.removeItem(
        CURRENT_ACCOUNT_KEY
    );

    creatingNewAccount = true;

    showWelcomeScreen();

    if (nameInput) {

        nameInput.value = "";

        nameInput.focus();

    }

    clearError();

}


/* =========================================================
   LOGOUT
   ========================================================= */

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        logoutCurrentAccount
    );

}


function logoutCurrentAccount() {

    localStorage.removeItem(
        CURRENT_ACCOUNT_KEY
    );

    stopGame();

    currentAccount = null;

    balance = 500;

    transactions = [];

    creatingNewAccount = false;

    closeAccounts();

    showWelcomeScreen();

    if (nameInput) {

        nameInput.value = "";

        nameInput.focus();

    }

    clearError();

}


/* =========================================================
   DELETE CURRENT ACCOUNT
   ========================================================= */

if (deleteAccountBtn) {

    deleteAccountBtn.addEventListener(
        "click",
        deleteCurrentAccount
    );

}


function deleteCurrentAccount() {

    if (!currentAccount) {

        alert(
            "No account is currently logged in."
        );

        return;
    }

    const name =
        currentAccount.name;

    const uid =
        currentAccount.uid;

    const confirmed =
        confirm(
            'Are you sure you want to permanently delete "' +
            name +
            '"?'
        );

    if (!confirmed) {
        return;
    }

    accounts =
        accounts.filter(
            account =>
                account.uid !== uid
        );

    saveAccounts();

    localStorage.removeItem(
        CURRENT_ACCOUNT_KEY
    );

    currentAccount = null;

    balance = 500;

    transactions = [];

    creatingNewAccount = false;

    stopGame();

    closeAccounts();

    showWelcomeScreen();

    if (nameInput) {

        nameInput.value = "";

        nameInput.focus();

    }

    clearError();

    alert(
        "Account deleted successfully."
    );

}


/* =========================================================
   DAILY SUBSCRIPTION REWARD
   ========================================================= */

function claimSubscriptionDailyReward() {

    if (!currentAccount) {
        return;
    }

    const tier =
        getSubscription();

    const info =
        getSubscriptionInfo();

    if (
        tier === "FREE" ||
        info.dailyCoins <= 0
    ) {
        return;
    }

    const today =
        todayKey();

    if (
        currentAccount.subscriptionLastDailyClaim ===
        today
    ) {
        return;
    }

    currentAccount.subscriptionLastDailyClaim =
        today;

    addCoins(
        info.dailyCoins,
        info.icon +
        " " +
        tier +
        " daily PlayCoins"
    );

    saveAccounts();

}


/* =========================================================
   SUBSCRIPTION PRICE
   ========================================================= */

function subscriptionPriceFor(targetTier) {

    const target =
        SUBSCRIPTIONS[
            normalizeSubscription(
                targetTier
            )
        ];

    if (
        !target ||
        target.name === "FREE"
    ) {
        return 0;
    }

    const current =
        getSubscription();

    /*
       ELITE gets 10% discount
       PREMIUM gets 20% discount
       when purchasing another paid tier.
    */

    let discount = 0;

    if (current === "PRO") {
        discount = 5;
    }

    if (current === "ELITE") {
        discount = 10;
    }

    if (current === "PREMIUM") {
        discount = 20;
    }

    if (
        current !== target.name &&
        discount > 0
    ) {

        return Math.max(
            0,
            Math.floor(
                target.price *
                (1 - discount / 100)
            )
        );

    }

    return target.price;

}


/* =========================================================
   PURCHASE SUBSCRIPTION
   ========================================================= */

function purchaseSubscription(
    targetTier
) {

    if (!currentAccount) {

        alert(
            "Please login first."
        );

        return;
    }

    const tier =
        normalizeSubscription(
            targetTier
        );

    if (tier === "FREE") {
        return;
    }

    if (
        getSubscription() ===
        tier
    ) {

        alert(
            "You already have " +
            tier +
            " subscription. 👑"
        );

        return;
    }

    const info =
        SUBSCRIPTIONS[tier];

    const price =
        subscriptionPriceFor(
            tier
        );

    const confirmed =
        confirm(
            info.icon +
            " " +
            tier +
            " Subscription\n\n" +

            "Price: " +
            price +
            " PlayCoins\n" +

            "Daily: " +
            info.dailyCoins +
            " PlayCoins\n" +

            "Video discount: " +
            info.videoDiscount +
            " PlayCoins\n\n" +

            "Buy this subscription?"
        );

    if (!confirmed) {
        return;
    }

    if (
        !spendCoins(
            price,
            "💳 Purchased " +
            tier +
            " subscription"
        )
    ) {
        return;
    }

    currentAccount.subscription =
        tier;

    currentAccount.subscriptionLastDailyClaim =
        null;

    saveAccounts();

    applySubscriptionTheme();
    updateVideoPrices();

    applySubscriptionAvatarEffect();

    claimSubscriptionDailyReward();

    renderSubscriptionPage();

window.addEventListener(
    "pagehide",
    () => {

        if (!currentAccount) {
            return;
        }

        try {

            fetch(
                firebaseURL(
                    "presence/" +
                    encodeURIComponent(
                        currentAccount.uid
                    )
                ),
                {
                    method: "PUT",
                    keepalive: true,
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        uid: currentAccount.uid,
                        name: currentAccount.name,
                        emoji: currentAccount.emoji,
                        lastSeen: 0
                    })
                }
            );

        } catch (error) {
            /* Heartbeat timeout remains the fallback. */
        }

    }
);

    alert(
        info.icon +
        " " +
        tier +
        " activated successfully!"
    );

}


/* =========================================================
   SUBSCRIPTION CARDS
   ========================================================= */

function renderSubscriptionPage() {

    const current =
        document.getElementById(
            "subscriptionCurrent"
        );

    const cards =
        document.getElementById(
            "subscriptionCards"
        );

    if (!current || !cards) {
        return;
    }

    const currentTier =
        getSubscription();

    const currentInfo =
        getSubscriptionInfo();

    current.textContent =
        "Current Pass: " +
        currentInfo.icon +
        " " +
        currentTier +
        " | PlayCoins: " +
        balance;

    cards.innerHTML = "";

    [
        "PRO",
        "ELITE",
        "PREMIUM"
    ].forEach(tier => {

        const info =
            SUBSCRIPTIONS[tier];

        const price =
            subscriptionPriceFor(
                tier
            );

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "subscription-card " +
            tier.toLowerCase();

        const header =
            document.createElement(
                "div"
            );

        header.className =
            "subscription-card-header";

        const heading =
            document.createElement(
                "h3"
            );

        heading.textContent =
            info.icon +
            " " +
            tier;

        header.appendChild(
            heading
        );

        card.appendChild(
            header
        );


        const priceBox =
            document.createElement(
                "div"
            );

        priceBox.className =
            "subscription-price";

        priceBox.textContent =
            "💳 " +
            price +
            " PlayCoins";

        card.appendChild(
            priceBox
        );


        const features =
            document.createElement(
                "div"
            );

        features.className =
            "subscription-features";


        addSubscriptionFeature(
            features,
            "🪙 Daily: " +
            info.dailyCoins +
            " PlayCoins"
        );

        addSubscriptionFeature(
            features,
            "🎬 Videos: " +
            info.videoDiscount +
            " PlayCoins cheaper"
        );


        if (tier === "PRO") {

            addSubscriptionFeature(
                features,
                "🪙 500 PlayCoins every day"
            );

            addSubscriptionFeature(
                features,
                "🎬 Videos are 50 PlayCoins cheaper"
            );

            addSubscriptionFeature(
                features,
                "🔵 Shiny blue PRO avatar frame + effect"
            );

            addSubscriptionFeature(
                features,
                "💳 Other paid passes can be bought at a discount"
            );

            addSubscriptionFeature(
                features,
                "💾 Pass benefits and account progress are saved"
            );

        }


        if (tier === "ELITE") {

            addSubscriptionFeature(
                features,
                "🪙 750 PlayCoins every day"
            );

            addSubscriptionFeature(
                features,
                "🎬 Videos are 100 PlayCoins cheaper"
            );

            addSubscriptionFeature(
                features,
                "👑 Shiny gold ELITE avatar frame + effect"
            );

            addSubscriptionFeature(
                features,
                "💳 10% discount on other paid pass prices"
            );

            addSubscriptionFeature(
                features,
                "🐦 Flappy Bird reward is doubled after 10x base scoring"
            );

            addSubscriptionFeature(
                features,
                "🎬 +100 PlayCoins after every video purchase"
            );

            addSubscriptionFeature(
                features,
                "💾 Pass stays active after reload and auto-login"
            );

            addSubscriptionFeature(
                features,
                "📜 All pass rewards appear in Wallet history"
            );

        }


        if (tier === "PREMIUM") {

            addSubscriptionFeature(
                features,
                "🪙 400 PlayCoins every day"
            );

            addSubscriptionFeature(
                features,
                "🎬 Videos are 200 PlayCoins cheaper"
            );

            addSubscriptionFeature(
                features,
                "💜 Shiny purple PREMIUM avatar frame + effect"
            );

            addSubscriptionFeature(
                features,
                "💳 20% discount on other paid pass prices"
            );

            addSubscriptionFeature(
                features,
                "🐦 Flappy Bird reward is doubled after 10x base scoring"
            );

            addSubscriptionFeature(
                features,
                "🎬 +100 PlayCoins after every video purchase"
            );

            addSubscriptionFeature(
                features,
                "💾 Pass stays active after reload and auto-login"
            );

            addSubscriptionFeature(
                features,
                "📜 Daily rewards are recorded in Wallet history"
            );

            addSubscriptionFeature(
                features,
                "🔓 Every purchased video remains unlocked"
            );

            addSubscriptionFeature(
                features,
                "👤 Subscription theme follows the active account"
            );

            addSubscriptionFeature(
                features,
                "🪙 Highest video discount tier"
            );

            addSubscriptionFeature(
                features,
                "💎 Full saved pass/account benefits"
            );

        }


        card.appendChild(
            features
        );


        const button =
            document.createElement(
                "button"
            );

        button.className =
            "subscription-button";

        const active =
            currentTier === tier;

        button.textContent =
            active
                ? "✅ ACTIVE"
                : "BUY " + tier;

        if (active) {

            button.disabled = true;

            button.classList.add(
                "active"
            );

        } else {

            button.addEventListener(
                "click",
                () => {

                    purchaseSubscription(
                        tier
                    );

                }
            );

        }

        card.appendChild(
            button
        );

        cards.appendChild(
            card
        );

    });

}


function addSubscriptionFeature(
    parent,
    text
) {

    const item =
        document.createElement(
            "div"
        );

    item.className =
        "subscription-feature";

    item.textContent =
        text;

    parent.appendChild(
        item
    );

}

/* =========================================================
   TANK CARTOON VIDEO WATCH
   ========================================================= */

function watchVideo(videoId) {
    if (!videoId) return;

    const videoURL =
        "https://www.youtube.com/watch?v=" + videoId;

    window.open(
        videoURL,
        "_blank",
        "noopener,noreferrer"
    );
}


/* =========================================================
   START
   ========================================================= */

applySubscriptionTheme();

autoLogin();

renderSubscriptionPage();