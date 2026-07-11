import { Inject, Provide } from "@midwayjs/core";
import { DatabaseService } from "./database.service";
import { Category } from "../interface";

type CategoryRow = {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
};

@Provide()
export class CategoryService {
  @Inject()
  databaseService: DatabaseService;

  private get db() {
    return this.databaseService.getDatabase();
  }

  listTree(): Category[] {
    const rows = this.db
      .prepare("SELECT id, name, parent_id, sort_order FROM categories ORDER BY sort_order, id")
      .all() as CategoryRow[];

    const all = rows.map(mapCategory);
    const map = new Map<number, Category>();
    const roots: Category[] = [];

    for (const cat of all) {
      cat.children = [];
      map.set(cat.id, cat);
    }

    for (const cat of all) {
      if (cat.parentId === null) {
        roots.push(cat);
      } else {
        const parent = map.get(cat.parentId);
        if (parent) {
          parent.children!.push(cat);
        }
      }
    }

    return roots;
  }

  listFlat(): Category[] {
    const rows = this.db
      .prepare("SELECT id, name, parent_id, sort_order FROM categories ORDER BY sort_order, id")
      .all() as CategoryRow[];
    return rows.map(mapCategory);
  }

  findById(id: number): Category | null {
    const row = this.db
      .prepare("SELECT id, name, parent_id, sort_order FROM categories WHERE id = ?")
      .get(id) as CategoryRow | undefined;
    return row ? mapCategory(row) : null;
  }

  create(name: string, parentId: number | null, sortOrder: number): Category {
    const result = this.db
      .prepare("INSERT INTO categories (name, parent_id, sort_order) VALUES (?, ?, ?)")
      .run(name, parentId, sortOrder);
    return this.findById(Number(result.lastInsertRowid))!;
  }

  update(id: number, name: string, sortOrder: number): Category | null {
    const existing = this.findById(id);
    if (!existing) return null;
    this.db
      .prepare("UPDATE categories SET name = ?, sort_order = ? WHERE id = ?")
      .run(name, sortOrder, id);
    return this.findById(id);
  }

  delete(id: number): boolean {
    // Check if category has children
    const childCount = this.db
      .prepare("SELECT COUNT(*) AS total FROM categories WHERE parent_id = ?")
      .get(id) as { total: number };
    if (childCount.total > 0) {
      throw new Error("该分类下有子分类，无法删除");
    }

    // Check if category has items
    const itemCount = this.db
      .prepare("SELECT COUNT(*) AS total FROM items WHERE category_id = ?")
      .get(id) as { total: number };
    if (itemCount.total > 0) {
      throw new Error("该分类下有商品，无法删除");
    }

    const result = this.db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    return result.changes > 0;
  }
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
  };
}