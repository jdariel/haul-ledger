import { pgTable, serial, text, real, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  expoPushToken: text("expo_push_token"), // Expo push notification token (nullable)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  date: text("date").notNull(),
  merchant: text("merchant").notNull(),
  category: text("category").notNull(),
  amount: real("amount").notNull(),
  notes: text("notes"),
  receiptUrl: text("receipt_url"),
  truckId: integer("truck_id"),
  gallons: real("gallons"),
  pricePerGallon: real("price_per_gallon"),
  jurisdiction: text("jurisdiction"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;

export const incomeTable = pgTable("income", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  date: text("date").notNull(),
  source: text("source").notNull(),
  amount: real("amount").notNull(),
  pickupLocation: text("pickup_location"),
  deliveryLocation: text("delivery_location"),
  loadedMiles: real("loaded_miles"),
  emptyMiles: real("empty_miles"),
  trailerNumber: text("trailer_number"),
  routeName: text("route_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIncomeSchema = createInsertSchema(incomeTable).omit({ id: true, createdAt: true });
export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type Income = typeof incomeTable.$inferSelect;

export const fuelEntriesTable = pgTable("fuel_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  date: text("date").notNull(),
  vendor: text("vendor").notNull(),
  gallons: real("gallons").notNull(),
  pricePerGallon: real("price_per_gallon").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  totalAmount: real("total_amount").notNull(),
  truckId: integer("truck_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFuelEntrySchema = createInsertSchema(fuelEntriesTable).omit({ id: true, createdAt: true });
export type InsertFuelEntry = z.infer<typeof insertFuelEntrySchema>;
export type FuelEntry = typeof fuelEntriesTable.$inferSelect;

export const tripsTable = pgTable("trips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  date: text("date").notNull(),
  pickupLocation: text("pickup_location"),
  deliveryLocation: text("delivery_location"),
  startOdometer: real("start_odometer").notNull(),
  endOdometer: real("end_odometer").notNull(),
  loadedMiles: real("loaded_miles").notNull(),
  emptyMiles: real("empty_miles").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  truckId: integer("truck_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTripSchema = createInsertSchema(tripsTable).omit({ id: true, createdAt: true });
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof tripsTable.$inferSelect;

export const assetsTable = pgTable("assets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  type: text("type").notNull(),
  vin: text("vin").notNull(),
  plate: text("plate").notNull(),
  year: integer("year").notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAssetSchema = createInsertSchema(assetsTable).omit({ id: true, createdAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetsTable.$inferSelect;

export const savedRoutesTable = pgTable("saved_routes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  name: text("name").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  standardRate: real("standard_rate").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSavedRouteSchema = createInsertSchema(savedRoutesTable).omit({ id: true, createdAt: true });
export type InsertSavedRoute = z.infer<typeof insertSavedRouteSchema>;
export type SavedRoute = typeof savedRoutesTable.$inferSelect;

export const quickExpensesTable = pgTable("quick_expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  label: text("label").notNull(),
  category: text("category").notNull(),
  defaultAmount: real("default_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuickExpenseSchema = createInsertSchema(quickExpensesTable).omit({ id: true, createdAt: true });
export type InsertQuickExpense = z.infer<typeof insertQuickExpenseSchema>;
export type QuickExpense = typeof quickExpensesTable.$inferSelect;
