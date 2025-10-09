import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  ManyToOne, 
  JoinColumn 
} from "typeorm";
import { FoodCategory } from "./food_category.model";

@Entity({ name: "ingredients" })
export class Ingredient {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  name: string;

  @JoinColumn({ name: "category_id", referencedColumnName: "id" })
  @ManyToOne(() => FoodCategory, { nullable: true })
  category: FoodCategory;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "varchar", nullable: true })
  image_url: string;

  @Column({ type: "int", nullable: true })
  shelf_life_days: number;

  @Column({ 
    type: "enum", 
    enum: ["frozen", "refrigerated", "room_temp"],
    default: "room_temp" 
  })
  storage_temperature: "frozen" | "refrigerated" | "room_temp";

  @Column({ type: "varchar", nullable: true })
  common_unit: string;

  @CreateDateColumn({ name: "created_at", nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", nullable: true })
  updatedAt: Date;

  @Column({ type: "boolean", default: true })
  is_active: boolean;
}
