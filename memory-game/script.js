document.addEventListener('DOMContentLoaded', () => {

    // === DOM要素の取得 ===
    const setupScreen = document.getElementById('setup-screen');
    const gameScreen = document.getElementById('game-screen');
    const steps = document.querySelectorAll('.setup-step');
    const backBtn = document.getElementById('back-btn');
    const nextBtn = document.getElementById('next-btn');

    // ステップ1
    const folderSelectBtn = document.getElementById('folder-select-btn');
    const filesSelectBtn = document.getElementById('files-select-btn');
    const folderInput = document.getElementById('folder-input');
    const filesInput = document.getElementById('files-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');

    // ゲーム画面
    const gameBoard = document.getElementById('game-board');
    const backToTitleBtn = document.getElementById('back-to-title-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const nextTurnBtn = document.getElementById('next-turn-btn');

    // クリアメッセージ
    const clearMessage = document.getElementById('clear-message');
    const clearBackToTitleBtn = document.getElementById('clear-back-to-title-btn');

    // 効果音
    const sounds = {
        button: document.getElementById('sfx-button'),
        open: document.getElementById('sfx-open'),
        pair: document.getElementById('sfx-pair'),
        fail: document.getElementById('sfx-fail'),
        clear: document.getElementById('sfx-clear'),
    };

    // === 状態変数 ===
    let currentStep = 1;
    let selectedFiles = []; // Fileオブジェクトを保持
    let gameSettings = {};
    let firstCard = null, secondCard = null;
    let lockBoard = false;
    let matchedPairs = 0;
    let totalPairs = 0;
    let currentCardSize = 120; // カードの現在のサイズ(px)


    // === 関数 ===

    /**
     * 指定されたIDの効果音を再生する
     * @param {string} soundId - 再生する音のID ('button', 'open'など)
     */
    function playSound(soundId) {
        const sound = sounds[soundId];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(error => console.error(`Error playing sound: ${soundId}`, error));
        }
    }

    /**
     * ナビゲーションボタンの状態を更新する
     */
    function updateNavButtons() {
        // 「戻る」ボタンは最初のステップでは非表示
        backBtn.style.visibility = currentStep > 1 ? 'visible' : 'hidden';

        // ボタンのテキストと状態を更新
        if (currentStep === 3) {
            nextBtn.textContent = 'ゲーム開始';
            nextBtn.disabled = false;
        } else {
            nextBtn.textContent = '決定';
            nextBtn.disabled = currentStep === 1 && selectedFiles.length === 0;
        }
    }

    /**
     * 指定されたステップを表示する
     * @param {number} stepNumber - 表示するステップ番号
     */
    function showStep(stepNumber) {
        steps.forEach(step => step.classList.remove('active'));
        document.getElementById(`step-${stepNumber}`).classList.add('active');
        currentStep = stepNumber;
        updateNavButtons();
    }
    
    /**
     * 選択されたファイルを処理し、プレビューを生成する
     * @param {FileList} files - ユーザーが選択したファイルのリスト
     */
    function handleFileSelection(files) {
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        selectedFiles.push(...imageFiles);
        
        // 重複ファイルを削除 (ファイル名とサイズで簡易的に判断)
        selectedFiles = selectedFiles.filter((file, index, self) => 
            index === self.findIndex(f => f.name === file.name && f.size === file.size)
        );

        renderImagePreviews();
        updateNavButtons();
    }

    /**
     * 画像プレビューエリアを再描画する
     */
    function renderImagePreviews() {
        imagePreviewContainer.innerHTML = ''; // 一旦空にする
        if (selectedFiles.length === 0) {
            imagePreviewContainer.innerHTML = '<p class="preview-placeholder">ここに選択した画像が表示されます。</p>';
        } else {
            selectedFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'preview-item';

                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'preview-image';
                    img.alt = file.name;

                    const removeBtn = document.createElement('div');
                    removeBtn.className = 'remove-btn';
                    removeBtn.innerHTML = '&times;';
                    removeBtn.onclick = () => {
                        playSound('button');
                        // 配列から該当ファイルを削除
                        selectedFiles = selectedFiles.filter(f => f.name !== file.name || f.size !== file.size);
                        renderImagePreviews(); // プレビューを再描画
                        updateNavButtons();
                    };

                    previewItem.appendChild(img);
                    previewItem.appendChild(removeBtn);
                    imagePreviewContainer.appendChild(previewItem);
                };
                reader.readAsDataURL(file);
            });
        }
    }
    
    /**
     * ゲームを開始する
     */
    function startGame() {
        // ゲーム設定を取得
        gameSettings.displayMode = document.querySelector('input[name="display-mode"]:checked').value;
        gameSettings.difficulty = document.querySelector('input[name="difficulty"]:checked').value;
        totalPairs = selectedFiles.length;

        if (totalPairs === 0) return;

        // カードデータを作成 (画像URLのペアを2つずつ)
        let cardData = [];
        selectedFiles.forEach(file => {
            const imageUrl = URL.createObjectURL(file);
            cardData.push({ id: file.name, url: imageUrl });
            cardData.push({ id: file.name, url: imageUrl });
        });
        
        // カードデータをシャッフル (Fisher-Yates algorithm)
        for (let i = cardData.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cardData[i], cardData[j]] = [cardData[j], cardData[i]];
        }

        // ゲームボードを生成
        createGameBoard(cardData);

        // 画面切り替え
        setupScreen.classList.remove('active');
        gameScreen.classList.add('active');
    }

    /**
     * ゲームボードとカードを生成する
     * @param {Array<Object>} cardData - シャッフル済みのカードデータの配列
     */
    function createGameBoard(cardData) {
        gameBoard.innerHTML = '';
        matchedPairs = 0;

        // グリッドの列数を計算 (アスペクト比が良くなるように)
        const numCards = cardData.length;
        const cols = Math.ceil(Math.sqrt(numCards));
        gameBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        cardData.forEach(data => {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.id = data.id;

            const cardFront = document.createElement('div');
            cardFront.className = 'card-face card-front';
            cardFront.style.backgroundImage = `url(${data.url})`;
            cardFront.style.backgroundSize = gameSettings.displayMode;
            cardFront.style.backgroundPosition = 'center';
            cardFront.style.backgroundRepeat = 'no-repeat';


            const cardBack = document.createElement('div');
            cardBack.className = 'card-face card-back';
            cardBack.textContent = '?';

            card.appendChild(cardFront);
            card.appendChild(cardBack);

            // 難易度による初期状態設定
            if (gameSettings.difficulty === 'hard') {
                // 最初は裏向きにする
                card.classList.add('flipped');
            }

            card.addEventListener('click', handleCardClick);
            gameBoard.appendChild(card);
        });

        updateCardSize(currentCardSize);
    }
    
    /**
     * カードクリック時の処理
     * @param {MouseEvent} e - クリックイベント
     */
    function handleCardClick(e) {
        const clickedCard = e.currentTarget;

        // 無効なクリックを無視
        if (lockBoard || clickedCard === firstCard || clickedCard.classList.contains('matched')) {
            return;
        }

        if (gameSettings.difficulty === 'hard') {
            // クリックされたらカードをめくる
            if (clickedCard.classList.contains('flipped')) {
                 playSound('open');
                 clickedCard.classList.remove('flipped');
            }
        } else { // easy mode
            playSound('button');
            clickedCard.classList.toggle('selected');
        }

        if (!firstCard) {
            firstCard = clickedCard;
            return;
        }

        secondCard = clickedCard;
        lockBoard = true; // 2枚めくったらボードをロック

        checkForMatch();
    }

    /**
     * 2枚のカードが一致するかチェックする
     */
    function checkForMatch() {
        const isMatch = firstCard.dataset.id === secondCard.dataset.id;
        
        // むずかしいモードではアニメーション時間(0.6s)を考慮して音を遅らせる
        const soundDelay = gameSettings.difficulty === 'hard' ? 700 : 300;
        
        setTimeout(() => {
            playSound(isMatch ? 'pair' : 'fail');
        }, soundDelay);

        // 「次へ」ボタンを表示
        nextTurnBtn.style.display = 'block';
        nextTurnBtn.onclick = () => {
            playSound('button');
            if (isMatch) {
                handlePairFound();
            } else {
                handlePairMismatch();
            }
        };
    }
    
    /**
     * ペアが成立した時の処理
     */
    function handlePairFound() {
        firstCard.classList.add('matched');
        secondCard.classList.add('matched');
        
        // イベントリスナーを削除して再クリックを防ぐ
        firstCard.removeEventListener('click', handleCardClick);
        secondCard.removeEventListener('click', handleCardClick);

        matchedPairs++;
        resetTurn();
        checkForWin();
    }
    
    /**
     * ペアが不成立だった時の処理
     */
    function handlePairMismatch() {
        // アニメーションが終わるのを待ってからカードを裏返す
        const flipDelay = gameSettings.difficulty === 'hard' ? 600 : 0;
        setTimeout(() => {
            if (gameSettings.difficulty === 'hard') {
                firstCard.classList.add('flipped');
                secondCard.classList.add('flipped');
            } else { // easy
                firstCard.classList.remove('selected');
                secondCard.classList.remove('selected');
            }
            resetTurn();
        }, flipDelay);
    }
    
    /**
     * ターンをリセットする
     */
    function resetTurn() {
        [firstCard, secondCard] = [null, null];
        lockBoard = false;
        nextTurnBtn.style.display = 'none';
        nextTurnBtn.onclick = null;
    }
    
    /**
     * ゲームクリアかチェックする
     */
    function checkForWin() {
        if (matchedPairs === totalPairs) {
            playSound('clear');
            setTimeout(() => {
                clearMessage.classList.add('show');
            }, 1000);
        }
    }

    /**
     * ゲームをリセットしてタイトル画面に戻る
     */
    function resetGame() {
        // 状態を初期化
        currentStep = 1;
        selectedFiles = [];
        firstCard = null;
        secondCard = null;
        lockBoard = false;
        matchedPairs = 0;
        totalPairs = 0;
        currentCardSize = 120;
        
        // DOMを初期化
        renderImagePreviews();
        gameBoard.innerHTML = '';
        clearMessage.classList.remove('show');

        // 画面を初期状態に
        gameScreen.classList.remove('active');
        setupScreen.classList.add('active');
        showStep(1);
    }
    
    /**
     * カードのサイズを更新する
     * @param {number} newSize - 新しいカードのサイズ (px)
     */
    function updateCardSize(newSize) {
        currentCardSize = Math.max(40, Math.min(300, newSize)); // サイズに制限を設ける
        const root = document.documentElement;
        root.style.setProperty('--card-size', `${currentCardSize}px`);
        root.style.setProperty('--gap-size', `${currentCardSize * 0.12}px`);
    }

    // === イベントリスナーの登録 ===
    
    // --- 設定画面 ---
    nextBtn.addEventListener('click', () => {
        playSound('button');
        if (currentStep < 3) {
            showStep(currentStep + 1);
        } else {
            startGame();
        }
    });

    backBtn.addEventListener('click', () => {
        playSound('button');
        if (currentStep > 1) {
            showStep(currentStep - 1);
        }
    });
    
    folderSelectBtn.addEventListener('click', () => {
        playSound('button');
        folderInput.click();
    });
    filesSelectBtn.addEventListener('click', () => {
        playSound('button');
        filesInput.click();
    });

    folderInput.addEventListener('change', (e) => handleFileSelection(e.target.files));
    filesInput.addEventListener('change', (e) => handleFileSelection(e.target.files));

    // --- ゲーム画面 ---
    backToTitleBtn.addEventListener('click', () => {
        playSound('button');
        resetGame();
    });
    
    clearBackToTitleBtn.addEventListener('click', () => {
        playSound('button');
        resetGame();
    });

    zoomInBtn.addEventListener('click', () => {
        playSound('button');
        updateCardSize(currentCardSize + 20);
    });

    zoomOutBtn.addEventListener('click', () => {
        playSound('button');
        updateCardSize(currentCardSize - 20);
    });
    
    // --- 初期化 ---
    showStep(1);
});
