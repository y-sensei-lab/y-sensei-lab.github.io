document.addEventListener('DOMContentLoaded', () => {
    // データストア
    const teams = {
        team1: { name: 'チームA', members: [], totalScore: 0, color: 'rgba(59, 130, 246, 0.7)' },
        team2: { name: 'チームB', members: [], totalScore: 0, color: 'rgba(239, 68, 68, 0.7)' }
    };

    // DOM要素の取得
    const teamNameInputs = {
        team1: document.getElementById('team1-name'),
        team2: document.getElementById('team2-name')
    };
    const forms = {
        team1: document.getElementById('form-team1'),
        team2: document.getElementById('form-team2')
    };
    const memberNameInputs = {
        team1: document.getElementById('member-name1'),
        team2: document.getElementById('member-name2')
    };
    const scoreInputs = {
        team1: document.getElementById('score1'),
        team2: document.getElementById('score2')
    };
    const memberLists = {
        team1: document.getElementById('members-list1'),
        team2: document.getElementById('members-list2')
    };
    const totalScoreDisplays = {
        team1: document.getElementById('total-score1'),
        team2: document.getElementById('total-score2')
    };
    const scoreDifferenceCard = document.getElementById('score-difference-card');
    const scoreDifferenceDisplay = document.getElementById('score-difference');
    const leaderText = document.getElementById('leader-text');

    // Chart.jsの初期化
    const ctx = document.getElementById('score-chart').getContext('2d');
    const scoreChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [teams.team1.name, teams.team2.name],
            datasets: [{
                label: '合計スコア',
                data: [0, 0],
                backgroundColor: [teams.team1.color, teams.team2.color],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 1,
                borderRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#e5e7eb'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    // UIを更新するメイン関数
    const updateUI = () => {
        // チーム1のUIを更新
        memberLists.team1.innerHTML = '';
        teams.team1.members.forEach((member, index) => {
            const li = createMemberListItem('team1', member, index);
            memberLists.team1.appendChild(li);
        });
        totalScoreDisplays.team1.textContent = teams.team1.totalScore;

        // チーム2のUIを更新
        memberLists.team2.innerHTML = '';
        teams.team2.members.forEach((member, index) => {
            const li = createMemberListItem('team2', member, index);
            memberLists.team2.appendChild(li);
        });
        totalScoreDisplays.team2.textContent = teams.team2.totalScore;

        // スコア差を更新
        updateScoreDifference();

        // グラフを更新
        updateChart();
    };
    
    // メンバーリストの項目を作成
    const createMemberListItem = (teamId, member, index) => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center bg-gray-50 p-3 rounded-lg';
        li.innerHTML = `
            <div class="flex items-center">
                <span class="font-medium text-gray-800">${member.name}</span>
            </div>
            <div class="flex items-center">
              <span class="font-semibold text-lg ${teamId === 'team1' ? 'text-blue-500' : 'text-red-500'}">${member.score}</span>
              <button data-team="${teamId}" data-index="${index}" class="remove-btn ml-4 text-gray-400 hover:text-red-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
        `;
        return li;
    };

    // メンバー追加処理
    const addMember = (teamId, name, score) => {
        if (!name || isNaN(score) || score === '') return;
        
        const team = teams[teamId];
        team.members.push({ name, score: Number(score) });
        team.totalScore = team.members.reduce((sum, member) => sum + member.score, 0);

        updateUI();
        
        // 入力フィールドをクリア
        memberNameInputs[teamId].value = '';
        scoreInputs[teamId].value = '';
        memberNameInputs[teamId].focus();
    };
    
    // メンバー削除処理
    const removeMember = (teamId, index) => {
        const team = teams[teamId];
        team.members.splice(index, 1);
        team.totalScore = team.members.reduce((sum, member) => sum + member.score, 0);
        updateUI();
    };

    // スコア差の表示を更新
    const updateScoreDifference = () => {
        const diff = Math.abs(teams.team1.totalScore - teams.team2.totalScore);
        scoreDifferenceDisplay.textContent = diff;

        scoreDifferenceCard.classList.remove('bg-blue-100', 'text-blue-800', 'bg-red-100', 'text-red-800', 'bg-gray-100', 'text-gray-800');

        if (teams.team1.totalScore > teams.team2.totalScore) {
            leaderText.textContent = `${teams.team1.name}がリード！`;
            scoreDifferenceCard.classList.add('bg-blue-100', 'text-blue-800');
        } else if (teams.team2.totalScore > teams.team1.totalScore) {
            leaderText.textContent = `${teams.team2.name}がリード！`;
            scoreDifferenceCard.classList.add('bg-red-100', 'text-red-800');
        } else {
            leaderText.textContent = '現在、同点です';
            scoreDifferenceCard.classList.add('bg-gray-100', 'text-gray-800');
        }
    };
    
    // グラフを更新
    const updateChart = () => {
        scoreChart.data.labels = [teams.team1.name, teams.team2.name];
        scoreChart.data.datasets[0].data = [teams.team1.totalScore, teams.team2.totalScore];
        scoreChart.update();
    };

    // イベントリスナーの設定
    // チーム名変更
    Object.keys(teamNameInputs).forEach(teamId => {
        teamNameInputs[teamId].addEventListener('input', (e) => {
            teams[teamId].name = e.target.value;
            updateChart();
            updateScoreDifference();
        });
    });

    // メンバー追加フォーム
    Object.keys(forms).forEach(teamId => {
        forms[teamId].addEventListener('submit', (e) => {
            e.preventDefault();
            addMember(teamId, memberNameInputs[teamId].value, scoreInputs[teamId].value);
        });
    });

    // メンバー削除ボタン (イベント移譲)
    document.body.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.remove-btn');
        if (removeBtn) {
            const teamId = removeBtn.dataset.team;
            const index = parseInt(removeBtn.dataset.index, 10);
            removeMember(teamId, index);
        }
    });

    // 初期化
    updateUI();
});
