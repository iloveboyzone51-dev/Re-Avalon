# **\[작업지시서\] 운빨 아발론 v4.0 AI 에이전트 시스템 전면 재설계**

**수신:** 안티그래비티 개발 그룹 (Antigravity Development Team)

**발신:** 기획 및 게임 디자인 부문

**일자:** 2026년 6월 13일

**주제:** '전투 기반 무한 성장 및 적극적 종결' 컨셉에 따른 AI 동작 매커니즘 전면 리팩토링

## **1\. 개요 및 설계 철학 (Vision & Philosophy)**

본 작업지시서는 게임의 핵심 컨셉을 "죽을 때까지 싸우며 성장하고, 적극적으로 경기를 끝내는 하드코어 AOS"로 재조정하기 위한 AI 엔진 리팩토링 가이드라인입니다.

기존의 산만하고 소극적인 AI 동작(구석진 곳 방황, 각개격파 당하기, 아군 방치 등)을 전면 배제하고, 플레이어로 하여금 긴장감 넘치는 대규모 한타(Team Fight)와 조직적인 전술 행동을 상시 경험하도록 AI의 판단 로직을 고도화합니다.

### **📌 핵심 원칙 (Core Principles)**

* **죽을 때까지 싸운다 (Fight to Death):** 파밍만을 위한 대기 상태를 없애고, 교전과 필드 정리를 적극적이고 유기적으로 전환합니다.  
* **스쿼드 기반 협동 기동 (Minimum 3-Hero Cohort):** 영웅들은 항상 최소 3명 이상 밀집하여 기동하는 것을 최우선 순위로 둡니다.  
* **소극적 행동 원천 배제:** 개별 영웅이 혼자 전선에서 이탈하거나, 공격받지 않는데도 뒤로 사리는 현상을 통제합니다.  
* **데드존 진입 봉쇄 (Anti-Wandering):** 타겟이 없는 상태에서 구석진 사각지대로 이동하는 비정상 패스파인딩을 물리적으로 원천 차단합니다.  
* **지능적 오브젝트 빌드업:** 평균 레벨과 기지 상황을 판단하여 타워, 수호신, 넥서스를 무너뜨리는 주도적인 피니시 능력을 갖춥니다.

## **2\. 핵심 메커니즘 가중치 설계 (Mathematical Model)**

AI 에이전트가 매 프레임별로 다음 행동(State)을 결정할 때 사용할 **우선순위 가중치 평가식**을 정의합니다.

### **2.1 대상 선정 점수 (Target Evaluation Score)**

AI 영웅이 위협 대상(적 영웅, 몬스터, 타워 등)을 타겟팅할 때 적용할 가중치 공식입니다.

* ![][image1]![][image2]: 대상과의 거리 (클수록 점수 감점)  
* ![][image3]: 체력 비율 (개딸피일수록 우선 타겟팅)  
* ![][image4]: 아군과 함께 있는 고립된 적에 대한 가중치 (![][image5]배 보정)  
* ![][image6]: 대상 주변의 적군 밀집도 대비 아군 밀집도 역수

## **3\. 세부 작업 요구사항 (Functional Requirements)**

\[동적 우선순위 트리 (Dynamic Decision Tree)\]  
  ├── 1순위: 기지 위기 감지 (Base Defense Override) \- 100% 최우선 복귀  
  ├── 2순위: 한타/고립 적 처단 (Team Fight / Gank) \- 최소 3인 결집 공격  
  ├── 3순위: 오브젝트 밀어붙이기 (Objective Push) \- 15레벨 이상 수호신/넥서스 저돌적 공격  
  └── 4순위: 필드 클리어 및 성장 (Field Sweep) \- 인근 크립 및 라인 신속 정리

### **\[요구사항 3.1\] 최소 3인 이상 밀집 기동 시스템 (Squad Core System)**

* **목적:** 흩어져서 각개격파 당하는 무능한 AI를 방지하고 조직적인 움직임을 연출합니다.  
* **구현 세부:**  
  * 각 팀별로 매 프레임 실시간으로 영웅들의 "팀 무게중심(Centroid)"을 계산합니다.  
  * 아군이 근처에 3명 미만일 경우, 개별 자율 기동을 제한하고 팀의 무게중심점 또는 가장 레벨이 높은 영웅(스쿼드 리더)의 위치로 강제 결집 기동을 실행합니다.  
  * 전투 돌입 시 흩어지지 않고, 아군의 스킬 범위가 겹칠 수 있도록 상호 연계 거리를 유지합니다.

### **\[요구사항 3.2\] 소극적 후퇴 배제 및 공격적 한타 지향 (Aggressive Engagement)**

* **목적:** 피가 조금만 깎여도 바로 기지로 도망쳐서 교전 흐름을 끊는 현상을 제거합니다.  
* **구현 세부:**  
  * **전투 지속 한계치 하향 조정:** 기존 체력 40% 이하일 때 무조건 후퇴하던 로직을 **15% 이하** 혹은 **주변 아군이 전멸하여 전력 차가 극심할 때**로 완화합니다.  
  * 아군이 3명 이상 근처에 모여있다면 체력이 적더라도 한타 승리를 위해 적극적으로 돌진하여 스킬을 난사하고 동반사망을 마다하지 않는 공격 전술을 구현합니다.  
  * 혼자 떨어져 라인을 정리하거나 정글을 돌고 있는 적을 발견하면 즉시 맵 핑(Ping) 시그널을 공유하고 아군 3인 이상이 순간적으로 덮치는 "암살/갱킹(Gank) 알고리즘"을 구현합니다.

### **\[요구사항 3.3\] 구석진 데드존(Dead-Zone) 진입 전면 봉쇄**

* **목적:** 맵의 가장자리나 의미 없는 벽면 구석에 끼여서 헤매는 버그를 원천 차단합니다.  
* **구현 세부:**  
  * 맵 전체 영역 중 교전이나 성장에 무의미한 구역을 '데드존(Dead-Zone)'으로 물리적/논리적 정의합니다.  
  * AI의 목적지 설정 함수(setDestination)가 호출될 때, 목적지 좌표가 맵 테두리로부터 일정 거리 내(예: 맵 크기의 8% 이내 구석)이거나 주변에 아군/적군/몬스터가 아무도 없는 비활성 구역인 경우, 강제로 최단거리의 라인(Lane) 중심부나 정글 캠프로 좌표를 재조정(Correction)합니다.

\+----------------------------------------+  
| \[Dead Zone \- Blocked\]                  |  
|    \+------------------------------+    |  
|    |                              |    |  
|    |      Active Combat Area      |    |  
|    |      (Lanes / Jungles)       |    |  
|    |                              |    |  
|    \+------------------------------+    |  
|                  \[Dead Zone \- Blocked\] |  
\+----------------------------------------+

### **\[요구사항 3.4\] 레벨 맞춤형 오브젝트 최우선 목표 전환 (Level-Based Escalation)**

* **목적:** 킬은 많이 따는데 게임을 끝낼 줄 몰라서 루즈해지는 문제를 해결합니다.  
* **구현 세부:**  
  * **평균 레벨 8\~14:** 포탑(Tower) 근처의 아군 미니언과 합을 맞춰 포탑 철거를 기획성 있게 수행합니다.  
  * **평균 레벨 15 이상:** 언제 어디서든 적 수호신(Guardian), 수호탑, 최종 넥서스(Nexus)를 최우선 타겟으로 상정합니다. 적 영웅이 소수 존재하더라도 넥서스 점사에 올인하여 게임을 종결짓는 화끈한 타격 패턴을 보입니다.

### **\[요구사항 3.5\] 기지 방어 긴급 인터럽트 트리거 (Base Defense Override)**

* **목적:** 기지가 깨지고 있는데 필드에서 정글 몹만 잡고 있는 바보 같은 동작을 차단합니다.  
* **구현 세부:**  
  * 아군 수호신 혹은 넥서스가 공격을 받는 순간(체력이 닳기 시작하거나 경고가 울릴 때), 필드의 모든 행동을 즉각 중단(Interrupt)합니다.  
  * 행동 상태를 STATE\_DEFEND\_BASE로 변경하고, 전원이 가장 빠른 기동 스킬과 이동 경로를 사용하여 본진 내부로 급파됩니다. 이때 기지 방어 전투 시에는 뭉쳐서 적의 포커싱을 흐트러뜨리는 폭발적인 수비 진형을 전개합니다.

## **4\. 구조적 의사 코드 (Technical Pseudocode Reference)**

기존 game.js 내의 AI 업데이트 루프에 통합할 수 있는 고성능 설계 프레임워크 예시입니다.

/\*\*  
 \* AI 에이전트 의사결정 코어 클래스 (Redesigned)  
 \*/  
class ReworkedAIController {  
    constructor(hero, gameEngine) {  
        this.hero \= hero;  
        this.engine \= gameEngine;  
        this.state \= 'SQUAD\_ROAM'; // SQUAD\_ROAM, ENGAGE, BASE\_DEFENSE, OBJECTIVE\_PUSH  
    }

    update() {  
        if (\!this.hero || this.hero.isDead) return;

        // 1단계: 기지 위기 감지 및 최우선 인터럽트  
        if (this.checkBaseUnderAttack()) {  
            this.state \= 'BASE\_DEFENSE';  
            this.executeBaseDefense();  
            return;  
        }

        // 2단계: 아군 밀집도(스쿼드 유지 여부) 검사  
        const nearbyAllies \= this.getNearbyAllies(800); // 반경 800px 내 아군  
        const averageTeamLevel \= this.engine.getAverageLevel(this.hero.team);

        // 3단계: 적극적인 전술 상태 결정  
        if (averageTeamLevel \>= 15\) {  
            this.state \= 'OBJECTIVE\_PUSH';  
            this.executeObjectivePush();  
        } else if (this.detectNearbyTarget()) {  
            this.state \= 'ENGAGE';  
            this.executeEngage(nearbyAllies);  
        } else {  
            this.state \= 'SQUAD\_ROAM';  
            this.executeSquadRoam(nearbyAllies);  
        }  
    }

    /\*\*  
     \* 구석진 고립 영역 필터링 및 타겟 보정 함수 (Wandering 방지 핵심)  
     \*/  
    sanitizePosition(targetX, targetY) {  
        const margin \= 150; // 맵 테두리 안전 마진  
        const mapWidth \= this.engine.map.width;  
        const mapHeight \= this.engine.map.height;

        let correctedX \= Math.max(margin, Math.min(mapWidth \- margin, targetX));  
        let correctedY \= Math.max(margin, Math.min(mapHeight \- margin, targetY));

        // 구석진 모퉁이 4곳의 데드존 필터링  
        const isNearCorner \= (  
            (correctedX \< margin \* 2 && correctedY \< margin \* 2\) ||  
            (correctedX \> mapWidth \- margin \* 2 && correctedY \< margin \* 2\) ||  
            (correctedX \< margin \* 2 && correctedY \> mapHeight \- margin \* 2\) ||  
            (correctedX \> mapWidth \- margin \* 2 && correctedY \> mapHeight \- margin \* 2\)  
        );

        if (isNearCorner) {  
            // 강제로 미드 라인 또는 가장 가까운 주요 거점으로 경로 수정  
            correctedX \= mapWidth / 2;  
            correctedY \= mapHeight / 2;  
        }

        return { x: correctedX, y: correctedY };  
    }

    /\*\*  
     \* 3인 이상 스쿼드 협동 기동 로직  
     \*/  
    executeSquadRoam(nearbyAllies) {  
        if (nearbyAllies.length \< 2\) {   
            // 나를 포함하여 3인 미만이면 즉시 아군 무게중심으로 모임  
            const centroid \= this.engine.getTeamCentroid(this.hero.team);  
            const safePos \= this.sanitizePosition(centroid.x, centroid.y);  
            this.hero.moveTo(safePos.x, safePos.y);  
        } else {  
            // 3인 이상 뭉친 상태라면 주변 정글 캠프 및 라인을 신속하게 동반 쓸어버림 (Field Sweep)  
            const closestCamp \= this.engine.getNearestMonsterCamp(this.hero.x, this.hero.y);  
            if (closestCamp) {  
                const safePos \= this.sanitizePosition(closestCamp.x, closestCamp.y);  
                this.hero.moveTo(safePos.x, safePos.y);  
            } else {  
                // 라인 푸시  
                const nextLaneTarget \= this.engine.getNearestLaneTarget(this.hero);  
                const safePos \= this.sanitizePosition(nextLaneTarget.x, nextLaneTarget.y);  
                this.hero.moveTo(safePos.x, safePos.y);  
            }  
        }  
    }

    /\*\*  
     \* 15레벨 이상 넥서스 / 수호신 무조건 공략 트리거  
     \*/  
    executeObjectivePush() {  
        const enemyNexus \= this.engine.getEnemyNexus(this.hero.team);  
        const enemyGuardian \= this.engine.getEnemyGuardian(this.hero.team);

        let primaryTarget \= enemyGuardian && \!enemyGuardian.isDead ? enemyGuardian : enemyNexus;

        if (primaryTarget) {  
            // 주변의 소소한 적들은 무시하고 오직 기지 붕괴 목적에 올인  
            this.hero.setTarget(primaryTarget);  
            this.hero.moveTo(primaryTarget.x, primaryTarget.y);  
            this.hero.useAllSkillsOn(primaryTarget);  
        }  
    }

    /\*\*  
     \* 본진 수비 기동 최우선 실행  
     \*/  
    executeBaseDefense() {  
        const myBase \= this.engine.getAllyNexus(this.hero.team);  
        if (myBase) {  
            // 기지에 도달할 때까지 어떠한 잡몹 어그로에도 끌리지 않고 직진  
            this.hero.moveTo(myBase.x, myBase.y);  
              
            // 기지 내부의 적 영웅을 무자비하게 타겟팅  
            const threat \= this.engine.getClosestEnemyInBase(this.hero.team);  
            if (threat) {  
                this.hero.setTarget(threat);  
                this.hero.useAllSkillsOn(threat);  
            }  
        }  
    }  
}

## **5\. QA 및 최종 인수 검증 시나리오 (Acceptance Criteria)**

AI 재설계 완료 후, 아래 5가지 시나리오가 올바르게 작동하는지 빌드에서 최종 확인합니다.

| 테스트 케이스 | 테스트 조건 및 행동 요구사항 | 기대 결과 (PASS 조건) |
| :---- | :---- | :---- |
| **TC-01: 스쿼드 뭉침 검증** | 게임 시작 후 30초 내에 아군 영웅이 흩어지지 않고, 최소 3인 이상 밀집 대형을 이루는가? | 맵 전역에서 단독으로 고립되는 아군 AI 영웅이 없어야 하며, 항상 최소 3명 이상이 스크럼을 짜며 이동해야 함. |
| **TC-02: 적극성 및 사기(Moral) 검증** | 교전 발생 시 개별 영웅이 HP가 30% 이상임에도 공격 없이 뒤로 사리며 후퇴하는가? | 교전이 끝날 때까지 스킬을 끊임없이 쏟아부으며, 적 영웅 킬 또는 완전 공멸할 때까지 라인을 수성함. |
| **TC-03: 모퉁이 이상 이동 방지** | 맵의 4개 구석 모퉁이 공간에 영웅을 밀어넣거나 방치했을 때 스스로 빠져나오는가? | 타겟이 없는 상태에서 구석에 가두면 AI는 즉시 sanitizePosition에 의해 맵 중앙 또는 활성 전투 영역으로 부드럽게 복귀함. |
| **TC-04: 엔드게임(End-Game) 트리거** | 아군 평균 레벨이 15에 도달했을 때 미니언 뒤에 숨지 않고 수호신과 넥서스로 정돌하는가? | 레벨 15 이후에는 모든 AI가 수호신 사거리 내로 진입하여 저돌적으로 본진 수호탑과 수호신, 최종 넥서스를 타격함. |
| **TC-05: 본진 침공 역습 반응** | 적군이 아군 넥서스를 타격할 때 필드의 아군 AI 영웅들이 즉각 반응하여 귀환하는가? | 정글 몹 타격 중이라도 아군 넥서스가 공격받으면 0.5초 내에 동작을 취소하고 본진 복귀 이동을 시작해야 함. |

[image1]: <data:image/png;base64,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>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAaCAYAAAC6nQw6AAABEUlEQVR4Xu2SLQ7CQBCFaYJAIQpp0/+GcAUcggMQBJYD1KBAIZGcgARPMBgENwFJAgYkihrCzxuyLM2UtkGS9Ete+vNmZ2dftlDI+XMsy6q4rjuBZgka27Zd5+sScRxn4HneAwsDZin4N4Lu8LvMi1FE4RK6Qk1u4l8NTU7Q2vf9EvclpmlWUbwl0Tv30cCADkIG9yU0BU2Dojk+Fe7/0ihIyOcF8mvAC6Gdpmk699+88wlpATcJbNKjjVIzysoHFNFgIRr1uSnJyofuEPwjtNF1XeO+JOX+EHTsKXRDXYebUdLyUego8C7iSLFpJRjbQtH+Sz50m1fwzni26TvifUCDFo0rAkzSUFXVMl+bkyN4AkPCWL7AFz4uAAAAAElFTkSuQmCC>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJkAAAAaCAYAAACkeP7MAAAFeElEQVR4Xu1aWYhcRRR9w0wHo452T2brnu6qURQZ4waKGyJ+jAtixCUfYSKCQnBJcMNxIGoQST5comFQEjUSUHRiiEkkMT/5GVFEozAK+iXi8qEfIoHgjwqj53Tdau+rft09LmTypA5c6tW9t6rfPVWv6r56nSQRERERERERERERERERC8Pg4OCQMWa6UqmcGNoiFKy1ZchmkPWyltHR0eLIyMgFoZ4C/7Vo2qO66YH+vtBPydOQs+HXpdrkHrVabRW4mAz1kdMWAGHrEegfKB8KTAx2N2QeMh7YUgCB56OPo5B3QegJXt/f39+Ltu9D/yvkMt0mr0AcY4jp9Wq1ujS0eUROFXjzDAI3/TvkCm2TLeFr2L8FoSPaFgI+q0kqZJPWDwwMnAzdLG3oa4W25RWIZR1iuSvUe0ROAzBQBszASYC2kSAhaneSXs6bAJ9pk/F0on46+v/R5uWp6wCuXohjO+S00OYROQ3QLmjopuRpmdL6ELCXIJ8wcBIQ2G6TPrYmHUjNAzionGRJm1gipwFU0J+a5oT0GyErteSHsC5H+dmmc4du1Ceg/wWyY2ho6KRUo5wCsWxAnnVjqNeInKbhk1AGPQVZqWQNAjpi/17u8BvafU/B9VGUB9D2kiRPb0FtYNzq8lq4BQaInGqo3OHLSqXSr21GlnwbvNlkAX7TJKTTE36cg9tO260HcY5Dnk/aDHDkNICQNm8ycge+ejNIs8DcwbilfSy05wQ9uPcZ0+aNEegCJ89wooQGjchpAAYrT8t/cZYzy1fr0J4HyOozh1gvDG0e4jNTKpVODW0akVOFdmc5fsmnLDR3QB/ToS1EX1/fKfB9FHLQurOfZRiMe9F2n5E3qOHh4QHo7mZSC58XoN+C8nqUO1FO9vb2LsvSo2mB7a07cedv7IE8jr6uhc8hxHEdyhXQvQ15FQNZFQ4mIXutG9Q34HO1vmcP9LMKtg2hXuMYc8qV9U74vIPyIn+Nds/Kb61l3CgfS4QbAvVN0G+D/zXwO1fU3ajfBNseGY8byAnsN/t2/whGzlpMxlmODMg8CeuQO3TBbwcJgdwSGjXkk8p7kOXIVc5C+QPkKSax7MM/+STYyFYD3ZW4Pgx5BLIG8hUnYJaeMaCvi3H9Acoz2Bd9Ub8ffd6K8icrZ0o1t+01tixeW3cs0QrcTl9Eu3NCg4Y5hpzyXmCfsG7SfCExF1Dfa9zLQZ98GeADdhXbkJ9yuWz9FwPF+QRt6pB3HWTzAu41G0ZyBgmiIdDtg3mJdatAyuZvxgMThqvJ56Ef5Ih6OhrQNy+qApNiTjb4nwn9nB9AXG/3EwC281D/iE8mg4UU6Z+l5zZGHdrugqzE9Ub0uR4r4qBxSbQ/Na9vW6ivZsWvPr6eBU4eDny1xWekxeCUcaGPilX3Tk6Ne/jqqyjvG7bPIGN+DDL8ulEuR9lDPq2kDfTP1VYtOQbfuJpyHhJEojjYxiW8XO3qJGlbqzZeJ7/xHeRy7cs+ofuQE4F1Ek7iOQBibwyEbqdhO3xGWiyE905+cT3HycJ6zX3EP8iHw4+B+PEt93DG2++4cFXS+ryA+cODCOA589cqcw/0BePypFnU78D1K5CP6SekcPVLfTaRSdOkT9xvMJ/Yqn+DkwPXM4m86ckWuhPlk9CX8TuXon4I8gDkdvaT7rb+m9uSDscbiwHjPjs9IVWuSG8xXlZkhX6TduN2hqUot/Daupx2F8qHi8XiqHU58kboXoLs51jILpCLw94UGDi3haR5IAvqra3gg5My9G2pJzJ+g0nvEuVS/xcDim5fly23Ze5RO37PqhhXI6mX/7Y14uK1xKpR9xcOfduGH3nI1Tb5fwAHLkziIyIiIiIiIiL+Jf4EVdJSuzBk7TYAAAAASUVORK5CYII=>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAAbCAYAAAA3d3w1AAADJUlEQVR4Xu2Xb2iNURzH780mQrfL3b3df8+9u5NaxGqIrLxZIlmalTKvJrUYLyQrwrxQCmWILFFemFDrxgjL/KlplD+1vUJR8kJprwgvxufn/k7dHc/MC2vP6vnWt3PO93f+/c45v/OcJxDw4cOHDx9jI5hKpRY6jnMlk8n8gJ/ID6bT6SXhcDhE/hJapd3I08Ch2Uz8KhP/RnogmUzOUX0u5X70V6TPYNhu61nE4/EMEx6Ab912BOdWYxuGJ22bZxGLxaI48xwO4cBS2y5g91I49YE6jbbNqyhhwmeZ8E/SVttogD2O/anbbnoSTHQ5/K67UW7bDWRXqdNeVlY207Z5EhIzulsXKQZt+6REJBKZhUOPxbHJFDtjQuIGvse5L7DaxV4p8ae34Ue+Zc1cLkljR6uRuEskEpHidhMO4mYGE+uBX+UDbNsFOFevR/WPax6t1bNHmEm3/O1GFIfcjmo2m52G1o29g/QyaZsslNjY1eloW9Cuw3N8KuaxcE1ot0kXSx49T/mYvGZ0HNn9PGzQIeS23ixtzZjSP21uwX0yhtFdoc+kHioPkdbadtU/Z6xrHi2H9g5ukDKT3Uv+uH7v7sEVqi9A74WbpA76gLxkMJWidVFeB+fDrdjXk97Vk5RzCq+cnA5Zgv2UvIbQ7pAuMnMZFeYpBYcZ7AXpIbiH/H06WEa+w77mGaROJmx08ofpR96R5+HpgB5PWRDav6Z+gnx3RnceLQwfwhr5lOgjoRO2iJ2+1hT3b8IGbTd9VZj+/wnRaDTmFFawgcarzDFxgzjiaNzJ4JQfMJmj6kSdqSd5tEGnsMMvxVHRKdeS7xMHtTzCLv0LTT/aVwX13sgCSSgU2/4b1LHfcUlaDftxsAr9ibmIJA7Q85Sb7R2WRYFt1Fkpi6h93JRPkC5UL1yLtjMUCpWTPqLeLukbvXPcHJMzzgBdDLSNQW8UrXS9U/hDaIQXsG9EDhpHtLmUT8B26uwXRzQ25WjugEfQ++AZ2jcFChfJQcrbSa9Rt8rMY7xQOspxLZW4DYyMg6miF5WDsjuSFmtO4WhOcbPbce7Dh4+JwS8XoNPWaiStXgAAAABJRU5ErkJggg==>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACoAAAAZCAYAAABHLbxYAAABlklEQVR4Xu2Vu0oDQRSGkyKFKGqiyWY3l92AKHaCVhZWIlgIFimEPIhgZWMv8QnERizUSiTkQUQFEdIoaKeNePkO7JJw2CSbUaPFfvAzZ86cmfnZmWQSiZiYmBhjLMsazeVyls53I5PJjOuc4zjTNCmd/xEKhcJUqVTaKpfLt2hbj3eD2g3XdR9pz1ETPaNGNpsd07U9YfPNfD7v6XyAfEEWPmazK3RK/GZg9FNE/I72ZU1d1xeMHjB5UefDkDr0YmDU9q+L+XEPw6jOGTEMo3LU7LMmMjp2YRhGOfozVEN79FvFYnFd1wUkKVqmqBqiS9lY523bdvUiJkY1vnH5YdX1mPBnRj3Pm+zsdxhtDnQNfvPo+WOfw9QDqgS5f2GUuzcjJ0eYlD7xPLVP6XR6Iqjx76oY3Q1ykRjEqH99XpmzEzJWYayFPtCq5DA+QnzUUZaif4Kuw65WT6IYZfxQvkKI7pEtNfIkEl+gO57b2WCuGGJ+nXyNtoFuGF9orx6RKEa/C3ussEeVdilh+jr1e+tjYmLafAHgbodryuPjAgAAAABJRU5ErkJggg==>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEcAAAAaCAYAAADloEE2AAAEJklEQVR4Xu2XS2iVRxTH7yUJKEol0TxuHvPFKNKK0EWsogh1Ia0FdSH4QuyupIWsKq2klCrYhS5ErIhiA+KiRKEQxBREBd0puomgRATxgehCrLQQEUuMv3++Mzfj9ObeuBESvz8cZs5jZr5z5pwz9+ZyGTJkyJAhw1RDTUNDQ2NbW9t3SZKMOufOFwoFpkmB+RroDPQa/mfZxos/CBCc7y04XZEqj6zHArQx0n0QqMb5P6H/oFWxElkHgXkC/dXe3j4j1k9rNDc3zyMAt0Sax3qVGPTAqBDrpzWULcoaHP8DNh/rywWHclzA2hPQXWgf+vnQSlRVplcvG0J3sLGxcRbjYmgAeoi8v6mpqT3cz6O1tXUmNl9jM8geX8Cvji/OvutX6Lad/0vO+mJLS0sr/DnoGms/17nY3WD+VbhHRbCwKyndb8bAx32G7oU+QM3by1mzEdkjaA1sHrttyF65IAOZH0K2gnGY8RLjfgXJnD+XlChVc+w6ul6z03xU55mJ+uAm+H8Yv8mlAalhfppv2Mq8Gt0B1i5HdpL5S53D/BR0DaodP608fL95oSDESoGNt9vHFR3h4GXwz1m3K7DzGVbMQJdm5VhmQidy4y9eXnbQ5fr6+tl+DwvGWeRD/iLgd8P/S9A+Fc93bkA2AvVoH78f8sPSYTsf3THta749Zt+FLr2g/vgyJkSlfpNLb6HPgtMtQeDAE8YObxgEoZiBVkpdLgo+fC10XR8PW+3l7L0W2WtoT2ArB2VbC+Zw7lXmzxhXKMtUKhboI5jXwNfhy8cKrkvLTZeSl1x6v29FuAr9xiL+GLqJow2S6QZ1k0lUEq5EEHKWIS4Kvj9Xa0JbOWLy4qvJ+vtQr+bB2fewOQ79CK0Py91jgjMmjzK/bwSV3FFoROnqhfoYrUH2U2SrG34rCEFmvpUh8HvY4zl7LPEylQGyy+geKSMCW13edpt3QsPQb14/EeST2XbGusmgXL/RjXdrc43ivcLSeDQJfhTq5uCHlCVWdr9DHUEzLwbfWUkllnmMPyj4VoIXFaCgDymbig76zHFBr/PQ+iCDSl7WpIETLRx0v8QG+qAzulnGdeIDndJcDU+vlHdYL8VxBUwfrWxI0vrXB/6v1OSoOdylUsW2z5csdt/qe8xJNdktzvqN9EG/69P+fk974Qaw/1K8z1hdlvbxdhXBAatZOCJnytDOurq6j+K1Hsn4M66nUqWwg7E3SX9zDOg1MzvJrqqR+rX2ipxHfoXxAg4t9Tpzfj/0FLrj0p8CY/0msFmIbFDnuLTvaK9+ArTI21iGqWz1tL9/WEkUgqac56Pmhk+z5iEfoErZUulZxfFVifWbCGNnReeHqJJeY6yYcggat57oTyRjXAn/d+5dymKaopoS2OvSUtVzroatvx2bY8MMGTJkmC54A68fWblV0RCqAAAAAElFTkSuQmCC>