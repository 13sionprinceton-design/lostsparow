import * as THREE from 'three';
import { soundEngine } from './audio';
import confetti from 'canvas-confetti';
import { Player } from './player';
import { MissionManager } from './missions';
import { StuntTier, StuntBonusEvent } from './types';

export interface HiddenStuntObjective {
  id: string;
  title: string;
  description: string;
  rewardCash: number;
  rewardXP: number;
  isUnlocked: boolean;
  check: (stunt: StuntBonusEvent, totalStunts: number) => boolean;
}

export class StuntSystem {
  public totalStunts: number = 0;
  public longestJump: number = 0;
  public totalStuntCash: number = 0;
  public lastStunt: StuntBonusEvent | null = null;
  public activeStuntDisplayTimer: number = 0;

  public hiddenObjectives: HiddenStuntObjective[] = [
    {
      id: 'stunt_first_leap',
      title: 'Daredevil Rookie',
      description: 'Successfully complete your first high-speed vehicle jump over 15 meters.',
      rewardCash: 1000,
      rewardXP: 300,
      isUnlocked: false,
      check: (stunt, total) => total >= 1 && stunt.distance >= 15,
    },
    {
      id: 'stunt_high_flyer',
      title: 'High Flyer',
      description: 'Launch a vehicle jump with at least 35 meters distance and massive airtime.',
      rewardCash: 2500,
      rewardXP: 750,
      isUnlocked: false,
      check: (stunt) => stunt.distance >= 35,
    },
    {
      id: 'stunt_insane_leap',
      title: 'Insane Stuntman',
      description: 'Clear an insane 50+ meter leap across city avenues or highway gaps!',
      rewardCash: 5000,
      rewardXP: 1500,
      isUnlocked: false,
      check: (stunt) => stunt.distance >= 50,
    },
    {
      id: 'stunt_gravity_defier',
      title: 'Gravity Defier',
      description: 'Pull off a legendary 75+ meter mega stunt jump into the stratosphere!',
      rewardCash: 10000,
      rewardXP: 3000,
      isUnlocked: false,
      check: (stunt) => stunt.distance >= 75,
    },
    {
      id: 'stunt_master_five',
      title: 'Stunt Virtuoso',
      description: 'Successfully land 5 unique stunt jumps across the open world.',
      rewardCash: 8000,
      rewardXP: 2500,
      isUnlocked: false,
      check: (stunt, total) => total >= 5,
    },
  ];

  public onStuntCompleted(
    stunt: StuntBonusEvent,
    player: Player,
    missions: MissionManager
  ) {
    this.totalStunts++;
    this.totalStuntCash += stunt.reward;
    this.lastStunt = stunt;
    this.activeStuntDisplayTimer = 4.5;

    if (stunt.distance > this.longestJump) {
      this.longestJump = stunt.distance;
    }

    // Update Player Stats
    player.cash += stunt.reward;
    player.stats.cashEarned += stunt.reward;
    player.stats.stuntsCompleted = (player.stats.stuntsCompleted || 0) + 1;
    player.stats.longestJumpMeters = Math.max(player.stats.longestJumpMeters || 0, stunt.distance);
    player.stats.stuntCashEarned = (player.stats.stuntCashEarned || 0) + stunt.reward;

    // 1. Add Stunt Bonus directly to the Kill Feed!
    missions.addStuntKillFeed(stunt);

    // 2. Play stunt sound fanfare
    soundEngine.playMissionFanfare(true);
    soundEngine.playCashPickup();

    // 3. Trigger celebratory confetti for Gold / Legendary jumps
    if (stunt.tier === 'gold' || stunt.tier === 'legendary') {
      try {
        confetti({
          particleCount: stunt.tier === 'legendary' ? 120 : 60,
          spread: 80,
          origin: { y: 0.65 },
          colors: ['#f59e0b', '#06b6d4', '#10b981', '#ec4899', '#ffffff'],
        });
      } catch {
        // ignore if canvas not ready
      }
    }

    // 4. Check Hidden Objectives
    this.checkHiddenObjectives(stunt, player, missions);

    // 5. Announce in Chat
    missions.addChatMessage(
      'Stunt Driver',
      `🚀 STUNT BONUS: ${stunt.tierLabel}! Jump Distance: ${stunt.distance}m • Height: ${stunt.height}m • Airtime: ${stunt.airTime.toFixed(1)}s (++$${stunt.reward.toLocaleString()})`,
      'system'
    );
  }

  private checkHiddenObjectives(
    stunt: StuntBonusEvent,
    player: Player,
    missions: MissionManager
  ) {
    this.hiddenObjectives.forEach((obj) => {
      if (!obj.isUnlocked && obj.check(stunt, this.totalStunts)) {
        obj.isUnlocked = true;
        player.cash += obj.rewardCash;
        player.stats.cashEarned += obj.rewardCash;

        // Special Hidden Objective Announcement
        missions.addChatMessage(
          'HIDDEN OBJECTIVE UNLOCKED',
          `🏆 [${obj.title}]: ${obj.description} — Reward: +$${obj.rewardCash.toLocaleString()} CASH & +${obj.rewardXP} XP!`,
          'system'
        );

        // Add special celebration entry to killfeed
        missions.addKillFeed(
          'HIDDEN OBJECTIVE',
          obj.title,
          'stunt'
        );

        try {
          confetti({
            particleCount: 100,
            spread: 90,
            origin: { y: 0.5 },
          });
        } catch {
          // ignore
        }
      }
    });
  }

  public update(delta: number) {
    if (this.activeStuntDisplayTimer > 0) {
      this.activeStuntDisplayTimer = Math.max(0, this.activeStuntDisplayTimer - delta);
    }
  }
}
