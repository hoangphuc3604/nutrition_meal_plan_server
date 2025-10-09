import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  JoinColumn, 
  OneToMany 
} from "typeorm";
import { User } from "./user.model";
import { MealPlanItem } from "./meal_plan_item.model";

@Entity({ name: "meal_plans" })
export class MealPlan {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @JoinColumn({ name: "user_id", referencedColumnName: "id" })
  @ManyToOne(() => User, { nullable: false })
  user: User;

  @Column({ type: "varchar" })
  name: string;
  
  @Column({ type: "date" })
  start_date: string;

  @Column({ type: "date" })
  end_date: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "boolean", default: false })
  ai_generated: boolean;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @OneToMany(() => MealPlanItem, (item) => item.meal_plan)
  mealPlanItems: MealPlanItem[];
}
