import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  JoinColumn 
} from "typeorm";
import { Recipe } from "./recipe.model";
import { MealPlan } from "./meal_plan.model";

export enum MealType {
  BREAKFAST = "breakfast",
  LUNCH = "lunch",
  DINNER = "dinner",
  SNACK = "snack"
}

@Entity({ name: "meal_plan_items" })
export class MealPlanItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @JoinColumn({ name: "meal_plan_id", referencedColumnName: "id" })
  @ManyToOne(() => MealPlan, { nullable: false })
  meal_plan: MealPlan;

  @JoinColumn({ name: "recipe_id", referencedColumnName: "id" })
  @ManyToOne(() => Recipe, { nullable: true })
  recipe: Recipe;

  @Column({ type: "date" })
  meal_date: string;

  @Column({ type: "enum", enum: MealType })
  meal_type: MealType;

  @Column({ type: "decimal" })
  servings: number;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "boolean", default: false })
  is_completed: boolean;

  @Column({ type: "timestamp", nullable: true })
  completed_at: Date;
}
