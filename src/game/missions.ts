import { Mission, ChatMessage, KillFeedEntry, StuntBonusEvent } from './types';
import { INITIAL_MISSIONS, BOT_CHAT_LINES } from './constants';
import { soundEngine } from './audio';
import confetti from 'canvas-confetti';

export class MissionManager {
  public availableMissions: Mission[] = [];
  public activeMission: Mission | null = null;
  public currentStageIndex: number = 0;
  public chatMessages: ChatMessage[] = [];
  public killFeed: KillFeedEntry[] = [];
  public isHackingVault: boolean = false;
  public hackProgress: number = 0;

  constructor() {
    this.availableMissions = JSON.parse(JSON.stringify(INITIAL_MISSIONS));
    this.initDefaultChat();
  }

  private initDefaultChat() {
    this.addChatMessage('System', 'Welcome to NOVAFORGE Online Sandbox Server #1 [Low Latency]', 'system');
    this.addChatMessage('Zero [Fixer]', 'Check your iFruit phone (P key) for available Heist contracts.', 'system');
    this.addChatMessage('Police Dispatch', 'All units be advised: 10-99 active across Downtown & Highway.', 'police');

    // Ambient bot messages every 15-25s
    setInterval(() => {
      if (Math.random() < 0.6) {
        const line = BOT_CHAT_LINES[Math.floor(Math.random() * BOT_CHAT_LINES.length)];
        const sender = ['Valkyrie_99', 'NeonDrifter', 'MatrixOperator', 'CyberSamurai'][Math.floor(Math.random() * 4)];
        this.addChatMessage(sender, line, 'bot');
      }
    }, 18000);
  }

  public addChatMessage(sender: string, text: string, type: 'system' | 'player' | 'bot' | 'police' | 'radio' = 'player') {
    const msg: ChatMessage = {
      id: 'msg_' + Date.now() + Math.random(),
      sender,
      text,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    this.chatMessages.push(msg);
    if (this.chatMessages.length > 30) this.chatMessages.shift();
  }

  public addKillFeed(killer: string, victim: string, weapon: any) {
    const entry: KillFeedEntry = {
      id: 'kf_' + Date.now() + Math.random(),
      killer,
      victim,
      weapon,
    };
    this.killFeed.push(entry);
    if (this.killFeed.length > 6) this.killFeed.shift();
  }

  public addStuntKillFeed(stunt: StuntBonusEvent) {
    const entry: KillFeedEntry = {
      id: 'kf_stunt_' + Date.now() + Math.random(),
      killer: 'Stunt Bonus',
      victim: `${stunt.distance}m [+$${stunt.reward}]`,
      weapon: 'stunt',
      isStunt: true,
      stuntData: stunt,
    };
    this.killFeed.push(entry);
    if (this.killFeed.length > 6) this.killFeed.shift();
  }

  public startMission(missionId: string): boolean {
    const mission = this.availableMissions.find((m) => m.id === missionId);
    if (!mission) return false;

    this.activeMission = JSON.parse(JSON.stringify(mission));
    this.currentStageIndex = 0;
    this.addChatMessage('Contract', `Started: "${mission.title}" - Check HUD for objective marker.`, 'system');
    soundEngine.playCashPickup();
    return true;
  }

  public cancelMission() {
    if (this.activeMission) {
      this.addChatMessage('Contract', `Mission "${this.activeMission.title}" cancelled.`, 'system');
      this.activeMission = null;
      this.currentStageIndex = 0;
    }
  }

  public updateMissionStageProgress(playerPos: { x: number; y: number; z: number }, onComplete: (rewardCash: number) => void) {
    if (!this.activeMission) return;
    const stage = this.activeMission.stages[this.currentStageIndex];
    if (!stage || stage.isCompleted) return;

    if (stage.type === 'reach_location' && stage.targetLocation) {
      const dx = playerPos.x - stage.targetLocation.x;
      const dz = playerPos.z - stage.targetLocation.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 15) {
        stage.isCompleted = true;
        this.advanceMissionStage(onComplete);
      }
    }
  }

  public onEnemyEliminated(onComplete: (rewardCash: number) => void) {
    if (!this.activeMission) return;
    const stage = this.activeMission.stages[this.currentStageIndex];
    if (!stage || stage.type !== 'eliminate_targets' || stage.isCompleted) return;

    stage.currentCount = (stage.currentCount || 0) + 1;
    if (stage.currentCount >= (stage.targetCount || 1)) {
      stage.isCompleted = true;
      this.advanceMissionStage(onComplete);
    }
  }

  public startVaultHack() {
    this.isHackingVault = true;
    this.hackProgress = 0;
  }

  public progressVaultHack(amount: number, onComplete: (rewardCash: number) => void) {
    if (!this.isHackingVault) return;
    this.hackProgress += amount;
    if (this.hackProgress >= 100) {
      this.isHackingVault = false;
      this.hackProgress = 100;
      if (this.activeMission) {
        const stage = this.activeMission.stages[this.currentStageIndex];
        if (stage && stage.type === 'hack_vault') {
          stage.isCompleted = true;
          this.advanceMissionStage(onComplete);
        }
      }
    }
  }

  private advanceMissionStage(onComplete: (rewardCash: number) => void) {
    soundEngine.playHitmarker(true);
    this.currentStageIndex++;

    if (!this.activeMission) return;

    if (this.currentStageIndex >= this.activeMission.stages.length) {
      // Mission Complete!
      const reward = this.activeMission.rewardCash;
      this.activeMission.completed = true;
      this.addChatMessage('Contract', `HEIST COMPLETED! Payout: +$${reward.toLocaleString()}`, 'system');
      soundEngine.playMissionFanfare(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      onComplete(reward);
      this.activeMission = null;
      this.currentStageIndex = 0;
    } else {
      const nextStage = this.activeMission.stages[this.currentStageIndex];
      this.addChatMessage('Objective', nextStage.instruction, 'system');
    }
  }
}
