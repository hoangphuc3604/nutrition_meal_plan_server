import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "food_categories" })
export class FoodCategory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar", nullable: true })
  name_en: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "int", nullable: true })
  sort_order: number;

  @Column({ type: "boolean", default: true })
  is_active: boolean;
}
