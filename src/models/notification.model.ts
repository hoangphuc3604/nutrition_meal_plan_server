import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from "typeorm";
import { User } from "./user.model";

export enum NotificationType {
    EXPIRY_REMINDER = "expiry_reminder",
    EXPIRED = "expired",
    LOW_STOCK = "low_stock"
}

export enum NotificationStatus {
    PENDING = "pending",
    SENT = "sent",
    READ = "read"
}

@Entity("notifications")
export class Notification {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => User, { nullable: false })
    user: User;

    @Column({
        type: "enum",
        enum: NotificationType,
        default: NotificationType.EXPIRY_REMINDER
    })
    type: NotificationType;

    @Column("text")
    message: string;

    @Column("date")
    scheduled_date: string;

    @Column({
        type: "enum",
        enum: NotificationStatus,
        default: NotificationStatus.PENDING
    })
    status: NotificationStatus;

    @CreateDateColumn()
    created_at: Date;

    @Column("timestamp", { nullable: true })
    sent_at: Date;
}

