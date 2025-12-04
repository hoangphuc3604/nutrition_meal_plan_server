import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.model";

@Entity("device_tokens")
export class DeviceToken {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user: User;

  @Column({ type: "varchar", length: 500 })
  token: string;

  @Column({ type: "varchar", length: 50 })
  platform: "ios" | "android" | "web";

  @Column({ type: "varchar", length: 255, nullable: true })
  deviceId: string | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

