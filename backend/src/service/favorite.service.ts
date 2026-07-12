import { Inject, Provide } from "@midwayjs/core";
import { DatabaseService } from "./database.service";
import { ItemService } from "./item.service";
import { Favorite } from "../interface";

type FavoriteRow = {
  id: number;
  user_id: number;
  item_id: number;
  created_at: string;
};

@Provide()
export class FavoriteService {
  @Inject()
  databaseService: DatabaseService;

  @Inject()
  itemService: ItemService;

  private get db() {
    return this.databaseService.getDatabase();
  }

  add(userId: number, itemId: number): Favorite {
    // Check item exists
    const item = this.itemService.findById(itemId);
    if (!item) {
      throw new Error("商品不存在");
    }

    // Check if already favorited
    const existing = this.db
      .prepare("SELECT id FROM favorites WHERE user_id = ? AND item_id = ?")
      .get(userId, itemId) as { id: number } | undefined;

    if (existing) {
      // Already favorited, return existing
      return this.findById(existing.id)!;
    }

    const result = this.db
      .prepare("INSERT INTO favorites (user_id, item_id) VALUES (?, ?)")
      .run(userId, itemId);

    return this.findById(Number(result.lastInsertRowid))!;
  }

  remove(userId: number, itemId: number): boolean {
    const result = this.db
      .prepare("DELETE FROM favorites WHERE user_id = ? AND item_id = ?")
      .run(userId, itemId);
    return result.changes > 0;
  }

  findByUser(userId: number): Favorite[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC",
      )
      .all(userId) as FavoriteRow[];
    return rows.map((r) => this.mapFavorite(r));
  }

  isFavorited(userId: number, itemId: number): boolean {
    const row = this.db
      .prepare("SELECT id FROM favorites WHERE user_id = ? AND item_id = ?")
      .get(userId, itemId) as { id: number } | undefined;
    return !!row;
  }

  findById(id: number): Favorite | null {
    const row = this.db
      .prepare("SELECT * FROM favorites WHERE id = ?")
      .get(id) as FavoriteRow | undefined;
    return row ? this.mapFavorite(row) : null;
  }

  private mapFavorite(row: FavoriteRow): Favorite {
    const item = this.itemService.findById(row.item_id);
    return {
      id: row.id,
      userId: row.user_id,
      itemId: row.item_id,
      createdAt: row.created_at,
      item: item ?? undefined,
    };
  }
}
