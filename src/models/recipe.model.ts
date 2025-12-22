import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn 
} from "typeorm";

@Entity({ name: "recipes" })
export class Recipe {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar", nullable: true })
  url: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "varchar", nullable: true })
  image_url: string;

  @Column({ type: "varchar", nullable: true })
  cuisine_type: string;

  @Column({ type: "enum", enum: ["easy", "medium", "hard"] })
  difficulty_level: "easy" | "medium" | "hard";

  @Column({ type: "int", nullable: true })
  prep_time_minutes: number;

  @Column({ type: "int", nullable: true })
  cook_time_minutes: number;

  @Column({ type: "int", nullable: true })
  servings: number;

  @Column({ type: "text", nullable: true })
  instructions: string;

  @Column({ type: "uuid" })
  created_by: string;

  @CreateDateColumn({ name: "created_at", nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", nullable: true })
  updatedAt: Date;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @Column({ type: "boolean", default: false })
  is_public: boolean;

  @Column({ type: "boolean", default: false })
  ai_generated: boolean;
}
