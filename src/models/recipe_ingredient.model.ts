import { 
  Entity, 
  Column, 
  ManyToOne, 
  JoinColumn, 
  PrimaryColumn, 
  OneToOne 
} from "typeorm";
import { Recipe } from "./recipe.model";
import { Ingredient } from "./ingredient.model";

@Entity({ name: "recipe_ingredients" })
export class RecipeIngredient {
  @PrimaryColumn()
  recipe_id: string;

  @PrimaryColumn()
  ingredient_id: string;

  @JoinColumn({ name: "ingredient_id", referencedColumnName: "id" })
  @ManyToOne(() => Ingredient, (ingredient) => ingredient.id)
  ingredient: Ingredient;

  @JoinColumn({ name: "recipe_id", referencedColumnName: "id" })
  @OneToOne(() => Recipe, (recipe) => recipe.id)
  recipe: Recipe;

  @Column({ type: "decimal" })
  quantity: number;

  @Column({ type: "varchar" })
  unit: string;

  @Column({ type: "varchar", nullable: true })
  preparation_method: string;

  @Column({ type: "boolean", default: false })
  is_optional: boolean;

  @Column({ type: "int", nullable: true })
  sort_order: number;
}
