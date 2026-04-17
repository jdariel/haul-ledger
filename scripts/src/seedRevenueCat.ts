import { getUncachableRevenueCatClient } from "./revenueCatClient";

import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listAppPublicApiKeys,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "HaulLedger";

// Apps
const APP_STORE_APP_NAME = "HaulLedger iOS";
const APP_STORE_BUNDLE_ID = "com.haulledger.app";
const PLAY_STORE_APP_NAME = "HaulLedger Android";
const PLAY_STORE_PACKAGE_NAME = "com.haulledger.app";

// Entitlement
const ENTITLEMENT_IDENTIFIER = "pro";
const ENTITLEMENT_DISPLAY_NAME = "HaulIQ Pro";

// Offering
const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "HaulIQ Pro Default";

// Products / Packages: Monthly + Annual
type ProductSpec = {
  identifier: string; // App Store + Test store
  playIdentifier: string; // {subId}:{basePlanId} for Play
  displayName: string;
  userTitle: string;
  duration: "P1M" | "P1Y";
  packageLookupKey: "$rc_monthly" | "$rc_annual";
  packageDisplayName: string;
  prices: { amount_micros: number; currency: string }[];
};

const PRODUCTS: ProductSpec[] = [
  {
    identifier: "pro_monthly",
    playIdentifier: "pro_monthly:monthly",
    displayName: "HaulIQ Pro Monthly",
    userTitle: "HaulIQ Pro Monthly",
    duration: "P1M",
    packageLookupKey: "$rc_monthly",
    packageDisplayName: "Monthly Subscription",
    prices: [{ amount_micros: 7_990_000, currency: "USD" }],
  },
  {
    identifier: "pro_annual",
    playIdentifier: "pro_annual:annual",
    displayName: "HaulIQ Pro Annual",
    userTitle: "HaulIQ Pro Annual",
    duration: "P1Y",
    packageLookupKey: "$rc_annual",
    packageDisplayName: "Annual Subscription",
    prices: [{ amount_micros: 59_990_000, currency: "USD" }],
  },
];

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  // ── Project ────────────────────────────────────────────────────────────────
  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError) throw new Error("Failed to list projects");

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log("Project already exists:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({
      client,
      body: { name: PROJECT_NAME },
    });
    if (error) throw new Error("Failed to create project");
    project = newProject;
    console.log("Created project:", project.id);
  }

  // ── Apps (test, App Store, Play Store) ────────────────────────────────────
  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps || apps.items.length === 0) {
    throw new Error("No apps found (test store should be auto-created)");
  }

  let testApp: App | undefined = apps.items.find((a) => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!testApp) throw new Error("No test store app found");
  console.log("Test store app:", testApp.id);

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: {
        name: APP_STORE_APP_NAME,
        type: "app_store",
        app_store: { bundle_id: APP_STORE_BUNDLE_ID },
      },
    });
    if (error) throw new Error("Failed to create App Store app");
    appStoreApp = newApp;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: {
        name: PLAY_STORE_APP_NAME,
        type: "play_store",
        play_store: { package_name: PLAY_STORE_PACKAGE_NAME },
      },
    });
    if (error) throw new Error("Failed to create Play Store app");
    playStoreApp = newApp;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app:", playStoreApp.id);
  }

  // ── Products (one per app per spec) ───────────────────────────────────────
  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products");

  const ensureProductForApp = async (
    targetApp: App,
    label: string,
    productIdentifier: string,
    spec: ProductSpec,
    isTestStore: boolean,
  ): Promise<Product> => {
    const existing = existingProducts.items?.find(
      (p) => p.store_identifier === productIdentifier && p.app_id === targetApp.id,
    );
    if (existing) {
      console.log(`${label} ${spec.identifier} product already exists:`, existing.id);
      return existing;
    }

    const body: CreateProductData["body"] = {
      store_identifier: productIdentifier,
      app_id: targetApp.id,
      type: "subscription",
      display_name: spec.displayName,
    };
    if (isTestStore) {
      body.subscription = { duration: spec.duration };
      body.title = spec.userTitle;
    }

    const { data: created, error } = await createProduct({
      client,
      path: { project_id: project.id },
      body,
    });
    if (error) throw new Error(`Failed to create ${label} product ${spec.identifier}`);
    console.log(`Created ${label} ${spec.identifier} product:`, created.id);
    return created;
  };

  type SeededProduct = { spec: ProductSpec; test: Product; app: Product; play: Product };
  const seeded: SeededProduct[] = [];

  for (const spec of PRODUCTS) {
    const test = await ensureProductForApp(testApp!, "Test Store", spec.identifier, spec, true);
    const app = await ensureProductForApp(appStoreApp!, "App Store", spec.identifier, spec, false);
    const play = await ensureProductForApp(playStoreApp!, "Play Store", spec.playIdentifier, spec, false);

    // Test store prices
    const { error: priceError } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: test.id },
      body: { prices: spec.prices },
    });
    if (priceError) {
      if (
        priceError &&
        typeof priceError === "object" &&
        "type" in priceError &&
        priceError["type"] === "resource_already_exists"
      ) {
        console.log(`Test prices already exist for ${spec.identifier}`);
      } else {
        throw new Error(`Failed to add test store prices for ${spec.identifier}`);
      }
    } else {
      console.log(`Added test store prices for ${spec.identifier}`);
    }

    seeded.push({ spec, test, app, play });
  }

  // ── Entitlement ───────────────────────────────────────────────────────────
  let entitlement: Entitlement;
  const { data: existingEntitlements, error: listEntError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntError) throw new Error("Failed to list entitlements");

  const existingEnt = existingEntitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_IDENTIFIER);
  if (existingEnt) {
    console.log("Entitlement already exists:", existingEnt.id);
    entitlement = existingEnt;
  } else {
    const { data: newEnt, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_IDENTIFIER, display_name: ENTITLEMENT_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create entitlement");
    entitlement = newEnt;
    console.log("Created entitlement:", entitlement.id);
  }

  const allProductIds = seeded.flatMap((s) => [s.test.id, s.app.id, s.play.id]);
  const { error: attachEntErr } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: allProductIds },
  });
  if (attachEntErr) {
    if (attachEntErr.type === "unprocessable_entity_error") {
      console.log("Some products already attached to entitlement");
    } else {
      throw new Error("Failed to attach products to entitlement");
    }
  } else {
    console.log("Attached products to entitlement");
  }

  // ── Offering ──────────────────────────────────────────────────────────────
  let offering: Offering;
  const { data: existingOfferings, error: listOffErr } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOffErr) throw new Error("Failed to list offerings");

  const existingOff = existingOfferings.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (existingOff) {
    console.log("Offering already exists:", existingOff.id);
    offering = existingOff;
  } else {
    const { data: newOff, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create offering");
    offering = newOff;
    console.log("Created offering:", offering.id);
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set offering as current");
    console.log("Set offering as current");
  }

  // ── Packages (monthly + annual) ───────────────────────────────────────────
  const { data: existingPackages, error: listPkgErr } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPkgErr) throw new Error("Failed to list packages");

  for (const s of seeded) {
    let pkg: Package;
    const existingPkg = existingPackages.items?.find((p) => p.lookup_key === s.spec.packageLookupKey);
    if (existingPkg) {
      console.log(`Package ${s.spec.packageLookupKey} already exists:`, existingPkg.id);
      pkg = existingPkg;
    } else {
      const { data: newPkg, error } = await createPackages({
        client,
        path: { project_id: project.id, offering_id: offering.id },
        body: { lookup_key: s.spec.packageLookupKey, display_name: s.spec.packageDisplayName },
      });
      if (error) throw new Error(`Failed to create package ${s.spec.packageLookupKey}`);
      pkg = newPkg;
      console.log(`Created package ${s.spec.packageLookupKey}:`, pkg.id);
    }

    const { error: attachErr } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: {
        products: [
          { product_id: s.test.id, eligibility_criteria: "all" },
          { product_id: s.app.id, eligibility_criteria: "all" },
          { product_id: s.play.id, eligibility_criteria: "all" },
        ],
      },
    });
    if (attachErr) {
      if (
        attachErr.type === "unprocessable_entity_error" &&
        attachErr.message?.includes("Cannot attach product")
      ) {
        console.log(`Skipping package attach for ${s.spec.packageLookupKey}: incompatible product`);
      } else {
        console.warn(`Attach warning for ${s.spec.packageLookupKey}:`, attachErr);
      }
    } else {
      console.log(`Attached products to package ${s.spec.packageLookupKey}`);
    }
  }

  // ── Public API keys ───────────────────────────────────────────────────────
  const { data: testKeys } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: testApp!.id },
  });
  const { data: appKeys } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: appStoreApp!.id },
  });
  const { data: playKeys } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: playStoreApp!.id },
  });

  console.log("\n====================");
  console.log("RevenueCat setup complete!");
  console.log("PROJECT_ID =", project.id);
  console.log("TEST_STORE_APP_ID =", testApp!.id);
  console.log("APP_STORE_APP_ID =", appStoreApp!.id);
  console.log("PLAY_STORE_APP_ID =", playStoreApp!.id);
  console.log("ENTITLEMENT =", ENTITLEMENT_IDENTIFIER);
  console.log("\nPublic API Keys (set as env vars):");
  console.log("EXPO_PUBLIC_REVENUECAT_TEST_API_KEY =", testKeys?.items?.[0]?.key ?? "N/A");
  console.log("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY  =", appKeys?.items?.[0]?.key ?? "N/A");
  console.log("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY =", playKeys?.items?.[0]?.key ?? "N/A");
  console.log("====================\n");
}

seedRevenueCat().catch((err) => {
  console.error(err);
  process.exit(1);
});
