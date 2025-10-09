import {
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  OneToOne,
  JoinColumn
} from "typeorm";
import { User } from "./user.model";

export enum ActivityLevel {
  SEDENTARY = "sedentary",
  LIGHT = "light",
  MODERATE = "moderate",
  ACTIVE = "active",
  VERY_ACTIVE = "very_active"
}

export enum HealthGoal {
  MAINTAIN = "maintain",
  LOSE_WEIGHT = "lose_weight",
  GAIN_WEIGHT = "gain_weight",
  GAIN_MUSCLE = "gain_muscle",
  IMPROVE_HEALTH = "improve_health"
}

@Entity({ name: "user_profiles" })
export class UserProfile {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  
  @OneToOne(() => User, { nullable: false })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "decimal" })
  height: number;

  @Column({ type: "decimal" })
  weight: number;

  @Column({ type: "enum", enum: ActivityLevel })
  activity_level: ActivityLevel;

  @Column({ type: "enum", enum: HealthGoal })
  health_goal: HealthGoal;

  @Column({ type: "decimal", nullable: true })
  target_weight: number;

  @Column({ type: "text", array: true, nullable: true })
  medical_conditions: string[];

  @Column({ type: "text", array: true, nullable: true })
  allergies: string[];

  @Column({ type: "text", array: true, nullable: true })
  dietary_preferences: string[];

  @Column({ type: "int", nullable: true })
  daily_calorie_target: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
