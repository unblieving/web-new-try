import { Config, Destroy, Init, Provide } from "@midwayjs/core";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

@Provide()
export class DatabaseService {
  @Config("database.path")
  databasePath: string;

  private database: DatabaseSync;

  @Init()
  async initialize() {
    const absolutePath = resolve(process.cwd(), this.databasePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    this.database = new DatabaseSync(absolutePath);
    this.database.exec("PRAGMA journal_mode = WAL");
    this.database.exec("PRAGMA foreign_keys = ON");
    this.createSchema();
    this.seedData();
  }

  getDatabase(): DatabaseSync {
    return this.database;
  }

  private createSchema() {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER,
        sort_order INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (parent_id) REFERENCES categories(id)
      );

      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        seller_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        available_quantity INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'pending_review',
        reject_reason TEXT,
        images TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (seller_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_no TEXT UNIQUE NOT NULL,
        buyer_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        total_price REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending_payment',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (buyer_id) REFERENCES users(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      );

      CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (item_id) REFERENCES items(id),
        UNIQUE(user_id, item_id)
      );

      CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
      CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
      CREATE INDEX IF NOT EXISTS idx_items_seller ON items(seller_id);
      CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_item ON orders(item_id);
      CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
    `);
  }

  private seedData() {
    const categoryCount = this.database
      .prepare("SELECT COUNT(*) AS total FROM categories")
      .get() as { total: number };

    if (categoryCount.total === 0) {
      // Seed categories (two-level structure)
      const insertCategory = this.database.prepare(
        "INSERT INTO categories (name, parent_id, sort_order) VALUES (?, ?, ?)",
      );

      // Level 1 categories
      insertCategory.run("教材", null, 0);
      const textbookId = Number(
        (
          this.database.prepare("SELECT last_insert_rowid() AS id").get() as {
            id: number;
          }
        ).id,
      );
      insertCategory.run("电子产品", null, 1);
      const electronicsId = Number(
        (
          this.database.prepare("SELECT last_insert_rowid() AS id").get() as {
            id: number;
          }
        ).id,
      );
      insertCategory.run("生活用品", null, 2);
      const dailyId = Number(
        (
          this.database.prepare("SELECT last_insert_rowid() AS id").get() as {
            id: number;
          }
        ).id,
      );
      insertCategory.run("宠物用品", null, 3);
      const petId = Number(
        (
          this.database.prepare("SELECT last_insert_rowid() AS id").get() as {
            id: number;
          }
        ).id,
      );
      insertCategory.run("服饰配件", null, 4);
      const fashionId = Number(
        (
          this.database.prepare("SELECT last_insert_rowid() AS id").get() as {
            id: number;
          }
        ).id,
      );

      // Level 2 categories
      insertCategory.run("课本", textbookId, 0);
      insertCategory.run("笔记", textbookId, 1);
      insertCategory.run("手机", electronicsId, 0);
      insertCategory.run("电脑", electronicsId, 1);
      insertCategory.run("宿舍用品", dailyId, 0);
      insertCategory.run("收纳整理", dailyId, 1);
      insertCategory.run("宠物食品", petId, 0);
      insertCategory.run("宠物玩具", petId, 1);
      insertCategory.run("宠物日用", petId, 2);
      insertCategory.run("发饰", fashionId, 0);
      insertCategory.run("包包", fashionId, 1);
      insertCategory.run("首饰", fashionId, 2);

      // Seed demo users
      this.seedDemoUsers();
      // Seed sample items
      this.seedSampleItems();
    }
  }

  private seedDemoUsers() {
    const userCount = this.database
      .prepare("SELECT COUNT(*) AS total FROM users")
      .get() as { total: number };

    if (userCount.total > 0) return;

    const insertUser = this.database.prepare(
      "INSERT INTO users (student_id, username, password_hash, role) VALUES (?, ?, ?, ?)",
    );

    // Simple password hash for demo users (password: 123456)
    const demoHash = "demo:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

    const users = [
      { studentId: "2024001", username: "小明同学", role: "user" },
      { studentId: "2024002", username: "爱宠达人", role: "user" },
      { studentId: "2024003", username: "收纳女王", role: "user" },
      { studentId: "2024004", username: "时尚学姐", role: "user" },
      { studentId: "2024005", username: "数码控", role: "user" },
      { studentId: "2024006", username: "毕业清仓", role: "user" },
      { studentId: "admin001", username: "管理员", role: "admin" },
    ];

    for (const u of users) {
      insertUser.run(u.studentId, u.username, demoHash, u.role);
    }
  }

  private seedSampleItems() {
    const itemCount = this.database
      .prepare("SELECT COUNT(*) AS total FROM items")
      .get() as { total: number };

    if (itemCount.total > 0) return;

    // Get user IDs
    const users = this.database
      .prepare("SELECT id, username FROM users WHERE role = 'user'")
      .all() as { id: number; username: string }[];

    if (users.length === 0) return;

    // Get category IDs
    const categories = this.database
      .prepare("SELECT id, name FROM categories WHERE parent_id IS NOT NULL")
      .all() as { id: number; name: string }[];

    const getCatId = (name: string) =>
      categories.find((c) => c.name === name)?.id ?? categories[0].id;

    const insertItem = this.database.prepare(
      `INSERT INTO items (seller_id, category_id, title, description, price, quantity, available_quantity, status, images)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'listed', ?)`,
    );

    const items = [
      {
        seller: "爱宠达人",
        category: "宠物食品",
        title: "皇家猫粮 2kg 未拆封",
        description:
          "买多了囤着的，皇家室内成猫粮，2kg装未拆封，保质期到2026年3月。家里猫主子换口味了，便宜出给有需要的铲屎官～",
        price: 68,
        quantity: 1,
        images: '["https://placehold.co/400x400/e0f2fe/0284c7?text=🐱+猫粮"]',
      },
      {
        seller: "爱宠达人",
        category: "宠物玩具",
        title: "猫咪逗猫棒套装（5件）",
        description:
          "全新逗猫棒套装，包含羽毛棒、铃铛球、激光笔等5件，买来猫主子不感兴趣，几乎全新。包装完好，送逗猫小铃铛一个！",
        price: 15,
        quantity: 1,
        images: '["https://placehold.co/400x400/fef3c7/d97706?text=🎣+逗猫棒"]',
      },
      {
        seller: "爱宠达人",
        category: "宠物日用",
        title: "宠物自动饮水机 九成新",
        description:
          "小佩智能饮水机，用了两个月，猫咪不爱喝流动水所以出了。功能完好，滤芯刚换新的，带原装适配器。静音设计，宿舍用也不吵。",
        price: 45,
        quantity: 1,
        images: '["https://placehold.co/400x400/dbeafe/2563eb?text=💧+饮水机"]',
      },
      {
        seller: "收纳女王",
        category: "收纳整理",
        title: "桌面收纳柜 三层透明抽屉",
        description:
          "透明亚克力桌面收纳柜，三层抽屉设计，放文具、化妆品、小物件都合适。用了半学期，无破损无划痕，毕业带不走出掉。尺寸约25×20×30cm。",
        price: 25,
        quantity: 1,
        images: '["https://placehold.co/400x400/f0fdf4/16a34a?text=🗄️+收纳柜"]',
      },
      {
        seller: "收纳女王",
        category: "收纳整理",
        title: "衣柜收纳箱 可折叠 3个装",
        description:
          "牛津布可折叠收纳箱3个，灰色百搭，放换季衣服被子超方便。每个约40×30×20cm，不用时可以折起来不占地方。用了两个月，干净无异味。",
        price: 20,
        quantity: 3,
        images: '["https://placehold.co/400x400/f5f3ff/7c3aed?text=📦+收纳箱"]',
      },
      {
        seller: "收纳女王",
        category: "宿舍用品",
        title: "床头置物架 免打孔",
        description:
          "宿舍神器！免打孔床头置物架，挂在上铺床边，放手机、眼镜、水杯都行。承重5kg没问题，安装简单不伤墙。毕业退宿带不走，便宜出。",
        price: 12,
        quantity: 1,
        images: '["https://placehold.co/400x400/ecfdf5/059669?text=🛏️+置物架"]',
      },
      {
        seller: "时尚学姐",
        category: "发饰",
        title: "韩系发卡套装 12只装",
        description:
          "超好看的韩系发卡套装，包含珍珠发卡、蝴蝶结发夹、金属几何发夹各4只。买来拍照用了两次，基本全新。适合日常搭配或者拍照凹造型～",
        price: 18,
        quantity: 1,
        images: '["https://placehold.co/400x400/fdf2f8/db2777?text=💇+发卡"]',
      },
      {
        seller: "时尚学姐",
        category: "发饰",
        title: "大肠发圈 真丝 5色套装",
        description:
          "真丝大肠发圈5只装，颜色分别是奶白、浅粉、雾蓝、香槟金、黑色。手感超好，不伤头发，戴一天也不会有勒痕。用了其中两只，其余全新。",
        price: 22,
        quantity: 1,
        images: '["https://placehold.co/400x400/fce7f3/be185d?text=🎀+发圈"]',
      },
      {
        seller: "时尚学姐",
        category: "包包",
        title: "帆布托特包 日系文艺风",
        description:
          "日系文艺帆布托特包，米白色带小熊刺绣，容量大可以放13寸笔记本。买来背了几次，没有污渍破损，五金件完好。适合上课或者逛街背。",
        price: 35,
        quantity: 1,
        images: '["https://placehold.co/400x400/fefce8/a16207?text=👜+帆布包"]',
      },
      {
        seller: "数码控",
        category: "手机",
        title: "iPhone 13 128G 星光色",
        description:
          "iPhone 13 128G 星光色，电池健康度87%，屏幕无划痕（一直贴膜），边框有轻微使用痕迹。国行正品，可验机。换了新机所以出掉，送手机壳和钢化膜。",
        price: 2200,
        quantity: 1,
        images: '["https://placehold.co/400x400/e0e7ff/4338ca?text=📱+iPhone"]',
      },
      {
        seller: "数码控",
        category: "电脑",
        title: "罗技K380蓝牙键盘 白色",
        description:
          "罗技K380多设备蓝牙键盘，白色款，可以同时连3台设备一键切换。手感好颜值高，适合宿舍用。用了半年，按键灵敏无失灵，送键盘收纳袋。",
        price: 89,
        quantity: 1,
        images: '["https://placehold.co/400x400/eff6ff/1d4ed8?text=⌨️+键盘"]',
      },
      {
        seller: "小明同学",
        category: "课本",
        title: "高等数学同济第七版 上下册",
        description:
          "高等数学同济大学第七版上下两册，内有少量铅笔笔记（可擦除），无缺页无破损。大一高数必备教材，考完试用不到了，便宜出给学弟学妹。",
        price: 25,
        quantity: 1,
        images: '["https://placehold.co/400x400/f0f9ff/0369a1?text=📚+高数"]',
      },
      {
        seller: "小明同学",
        category: "笔记",
        title: "考研数学笔记 手写整理版",
        description:
          "考研数学一全套手写笔记，包含高数、线代、概率论三部分，共约200页。字迹工整，重点用荧光笔标注，附赠错题本一册。已上岸，希望笔记能帮到你！",
        price: 40,
        quantity: 1,
        images: '["https://placehold.co/400x400/f0fdfa/0d9488?text=📝+笔记"]',
      },
      {
        seller: "毕业清仓",
        category: "宿舍用品",
        title: "LED台灯 三档调光 USB充电",
        description:
          "宿舍学习必备LED台灯，三档亮度可调，USB充电款（充满用8小时）。灯管可弯曲调节角度，底座稳固。用了大四一年，功能完好，光线柔和不伤眼。",
        price: 18,
        quantity: 1,
        images: '["https://placehold.co/400x400/fef9c3/a16207?text=💡+台灯"]',
      },
      {
        seller: "毕业清仓",
        category: "宿舍用品",
        title: "小风扇 USB桌面扇 可夹可立",
        description:
          "多功能桌面小风扇，可以夹在床头也可以立在桌上，两档风力，超静音。USB供电，充电宝也能带。夏天宿舍必备，毕业带不走出掉。",
        price: 15,
        quantity: 1,
        images: '["https://placehold.co/400x400/ecfeff/0891b2?text=🌀+风扇"]',
      },
      {
        seller: "毕业清仓",
        category: "收纳整理",
        title: "鞋架 四层简易组装",
        description:
          "简易四层鞋架，钢管+无纺布材质，好组装也好拆。每层放2-3双鞋，宿舍门口放着刚好。用了两年，布面干净无破损，钢管无锈蚀。",
        price: 10,
        quantity: 1,
        images: '["https://placehold.co/400x400/f1f5f9/475569?text=👟+鞋架"]',
      },
    ];

    for (const item of items) {
      const seller = users.find((u) => u.username === item.seller);
      if (!seller) continue;
      const catId = getCatId(item.category);
      insertItem.run(
        seller.id,
        catId,
        item.title,
        item.description,
        item.price,
        item.quantity,
        item.quantity,
        item.images,
      );
    }
  }

  @Destroy()
  async close() {
    this.database?.close();
  }
}
