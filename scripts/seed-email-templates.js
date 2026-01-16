#!/usr/bin/env tsx
"use strict";
/**
 * Script to seed email templates to Firestore
 *
 * This script saves the default email templates from src/lib/email-templates.ts
 * to the Firestore database under the 'emailTemplates' collection.
 *
 * Usage:
 *   pnpm tsx scripts/seed-email-templates.ts
 *
 * Note: You must be authenticated as pawme@ayvalabs.com to run this script.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var app_1 = require("firebase/app");
var firestore_1 = require("firebase/firestore");
var auth_1 = require("firebase/auth");
var readline = require("readline");
var email_templates_1 = require("../src/lib/email-templates");
// Firebase configuration
var firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};
// Initialize Firebase
var app = (0, app_1.initializeApp)(firebaseConfig);
var db = (0, firestore_1.getFirestore)(app);
var auth = (0, auth_1.getAuth)(app);
// Create readline interface for user input
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
function question(query) {
    return new Promise(function (resolve) {
        rl.question(query, resolve);
    });
}
function seedTemplates() {
    return __awaiter(this, void 0, void 0, function () {
        var email, password, templatesRef, _i, _a, _b, templateId, template, templateDoc, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 8, , 9]);
                    console.log('🔐 Firebase Email Template Seeder');
                    console.log('================================\n');
                    // Check if environment variables are set
                    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
                        console.error('❌ Firebase configuration not found in environment variables.');
                        console.error('Make sure your .env.local file is properly configured.');
                        process.exit(1);
                    }
                    // Authenticate as admin
                    console.log('Please sign in with admin credentials (pawme@ayvalabs.com):\n');
                    return [4 /*yield*/, question('Email: ')];
                case 1:
                    email = _c.sent();
                    return [4 /*yield*/, question('Password: ')];
                case 2:
                    password = _c.sent();
                    console.log('');
                    if (email !== 'pawme@ayvalabs.com') {
                        console.error('❌ Only pawme@ayvalabs.com can seed email templates.');
                        rl.close();
                        process.exit(1);
                    }
                    console.log('🔑 Authenticating...');
                    return [4 /*yield*/, (0, auth_1.signInWithEmailAndPassword)(auth, email, password)];
                case 3:
                    _c.sent();
                    console.log('✅ Authenticated successfully!\n');
                    templatesRef = (0, firestore_1.collection)(db, 'emailTemplates');
                    console.log('📧 Seeding email templates to Firestore...\n');
                    _i = 0, _a = Object.entries(email_templates_1.defaultTemplates);
                    _c.label = 4;
                case 4:
                    if (!(_i < _a.length)) return [3 /*break*/, 7];
                    _b = _a[_i], templateId = _b[0], template = _b[1];
                    console.log("  \uD83D\uDCDD Saving template: ".concat(template.name, " (").concat(templateId, ")"));
                    templateDoc = (0, firestore_1.doc)(templatesRef, templateId);
                    return [4 /*yield*/, (0, firestore_1.setDoc)(templateDoc, {
                            id: template.id,
                            name: template.name,
                            subject: template.subject,
                            html: template.html,
                            variables: template.variables,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                        })];
                case 5:
                    _c.sent();
                    console.log("  \u2705 Saved: ".concat(template.name));
                    _c.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7:
                    console.log('\n🎉 All email templates have been successfully seeded to Firestore!');
                    console.log("\nTotal templates saved: ".concat(Object.keys(email_templates_1.defaultTemplates).length));
                    console.log('\nTemplates saved:');
                    Object.values(email_templates_1.defaultTemplates).forEach(function (t) {
                        console.log("  - ".concat(t.name, " (").concat(t.id, ")"));
                    });
                    rl.close();
                    process.exit(0);
                    return [3 /*break*/, 9];
                case 8:
                    error_1 = _c.sent();
                    console.error('\n❌ Error seeding templates:', error_1.message);
                    rl.close();
                    process.exit(1);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
// Run the seeder
seedTemplates();
