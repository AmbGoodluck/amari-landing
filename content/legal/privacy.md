# Privacy Policy

**Ask Amari**

Effective date: November 12, 2026

This policy explains what information Ask Amari collects, how we use it, who we share it with, how long we keep it, and the choices and rights you have. It applies to the Amari app for iPhone (listed on the App Store as "Ask Amari"), the web app at app.askamari.us, and the website at askamari.us (together, "Amari" or "the Service").

"We", "us" and "our" mean [Legal name of the operator], the operator of Amari. "You" means the person using Amari.

If you have a question, write to **support@askamari.us**.

---

## 1. The short version

- **Most of your information stays on your device.** Your kitchen, plan, shopping list, saved recipes and preferences are kept on your phone or browser. A copy is kept on our servers only if you sign in, so it can follow you to other devices.
- **Your photos are not kept.** When you scan your fridge or cupboard, the photos are sent to an AI service to recognise the food, then discarded. We keep the names of the foods found, never the photos.
- **We ask before sharing your information with an AI service.** Scanning, Ask Amari and new recipes use third-party AI. The app explains what is sent and asks for your permission the first time you use each one.
- **We don't sell your information, we don't use it for advertising, and we don't track you** across other companies' apps or websites.
- **Analytics are off unless you turn them on.** They never include your allergies, diet, goals or weight.
- **You can export your data or delete your account** at any time in the app: You → Privacy and data.

---

## 2. Information we collect

### 2.1 Information you give us

| Information | When | Why we use it |
|---|---|---|
| **Food preferences**: cuisines you like, foods you avoid, time you have to cook, cooking skill, household size, kitchen equipment, budget | Setup and You | To suggest dinners you'll like and can make |
| **Allergies and diets**: for example peanut allergy, vegetarian, halal (optional) | Setup and You | To keep dishes that break your rules out of your suggestions, and to warn you about conflicts |
| **Goals and body information**: for example a weight goal, a weight log, activity level (optional) | You → Goals | To shape suggestions and show estimated calories and protein. Weight is stored only if you choose to log it |
| **Your first name** (optional) | Setup, or from Apple or Google sign-in | To greet you in the app |
| **Your kitchen**: foods you have, amounts, use-by estimates | Scans, manual entry | To work out what you can cook now |
| **Your activity in the app**: recipes you cooked, saved, rated, skipped or planned; your shopping list | Using the app | To learn what you enjoy and keep your plan and list |
| **Account details**: your email address, or the identifier, email and name Apple or Google share when you sign in with them | Creating an account (optional) | To sign you in and keep your information together across devices |
| **Photos of your fridge or cupboard** | Scanning | To recognise the food. **Not stored** (see section 4) |
| **Questions you ask Amari** | Ask Amari | To answer them. **Not stored** (see section 5) |
| **Recipe requests**: the dish you ask Amari to write | Asking for a dish the collection doesn't have | To write the recipe (see section 5) |
| **Feedback**: the kind of feedback, your message, the screen you were on, the app version, and the recipe if you sent it from one | You → Send feedback, or a recipe page | To fix problems, improve Amari and reply to you |

### 2.2 Information collected automatically

| Information | When | Why we use it |
|---|---|---|
| **Account identifier**: a random ID for your account. If you use a feature that needs our servers before you sign in (such as scanning), a guest ID with no name or email is created | First use of a server feature | To keep your information separate from everyone else's, and to apply fair-use limits |
| **Usage counts**: how many scans you made today, how many Ask Amari messages and new recipes this month | Using those features | To apply fair-use limits and protect the service from abuse |
| **Scan records**: the time, the number of photos and the names of the foods found | Each scan | Daily limits, and your kitchen history |
| **Usage events (only if you turn analytics on)**: for example "recipe opened" or "scan completed", and short search terms (up to 40 characters, as typed in recipe search) | Using the app | To understand which features help people and which recipes are missing. Never includes allergies, diets, goals or weight |
| **Crash and error reports (unless you turn them off)**: the error message, the screen's path, the platform and the app version. Emails, tokens, IDs, search terms, typed text, food names and web addresses' query strings are removed before anything is sent | When something goes wrong | To find and fix bugs |
| **Performance samples (unless you turn crash reports off)**: how long about 1 in 10 page loads took | Using the app | To keep the app fast |
| **Device push address (only if you turn notifications on)**: an Apple device token, or a browser push subscription in the installed web app, with the app version | Turning on notifications | To deliver notifications you asked for |
| **Technical and security data**: IP address, device and browser type, and request times, processed by our hosting, security and bot-protection providers | Every connection | To deliver the Service, keep it secure and prevent abuse |
| **Server logs**: warnings and errors from our server functions, such as an AI service timing out. They contain no photos, questions, typed text, emails or tokens | When a server function has a problem | To monitor and fix the Service |

### 2.3 Information we don't collect

We don't collect your precise location, contacts, photo library (other than photos you choose to scan), browsing history, health records from Apple Health, payment card details, or advertising identifiers.

---

## 3. Information stored on your device

Your kitchen, plan, shopping list, preferences, allergies, goals, weight log and recipe history are saved on your device, so Amari works offline and quickly. If you don't sign in, this is the main copy.

- Deleting the app (or clearing the website's data in your browser) deletes it from that device.
- Your phone's backups (for example iCloud) may include it, under your backup provider's terms.
- If you sign in, a copy is kept on our servers so you can use it on other devices. It's protected so that only your account can read it.

---

## 4. Photos and food recognition

- Photos are resized on your device and location information is removed before they're sent.
- They're sent to an AI model to identify the food. We use Cloudflare Workers AI (with Google's Gemma and Meta's Llama models), and Google's Gemini as a backup.
- **We don't store your photos.** We keep only the names of the foods found, the number of photos and the time.
- The AI service receives the photos and a list of foods to look for. It doesn't receive your name, email, account ID or profile.
- The app asks for your permission before your first scan, and you can choose not to scan and add foods by hand instead.
- Please don't photograph people, documents or anything private. If a photo shows something other than food, it's still only used to find food and isn't kept.

---

## 5. Ask Amari and recipes Amari writes

Ask Amari answers cooking questions using an AI model. We use Cloudflare Workers AI (Google's Gemma model) and Google's Gemini as a backup.

When you ask a question, the request includes the information Amari needs to answer well:
- your first name, if you've given one
- your allergies, diets and the foods you avoid
- your goals, the cuisines you like, your time limit, your cooking skill and your household size
- what's in your kitchen, and the recipe you're looking at, if any
- your question and the earlier messages in the same conversation

It doesn't include your email address, your account ID or your photos. **We don't store your conversations.** We count your messages for fair-use limits; the text is used only to produce the answer.

When you ask for a dish the collection doesn't have, Amari writes a recipe using Google's Gemini models (for the text, and for a picture of the dish). Only the dish name and your diet rules are sent; no name, email or account details. Recipes written this way are saved without your name so the next person who asks for the same dish gets it immediately, and popular ones may be reviewed and added to Amari's public recipe collection.

The app asks for your permission before it first sends your information to an AI service for Ask Amari or a new recipe.

**AI can be wrong.** Amari tells the AI to respect your allergies and diets and checks its replies against your rules, but it can still make mistakes. Always check ingredients and labels yourself. See our Terms of Use.

We don't use your information to train AI models, and our AI providers' terms for paid business use don't allow them to use it to train theirs. [Confirm against each provider's current API terms before publishing.]

---

## 6. Shopping

- **Instacart:** when you tap "Shop on Instacart", the names and amounts of the items on your list are sent to Instacart to build a shopping page. Your name, address and account details are not sent.
- **Walmart and Target:** tapping a store link opens that store's website or app with a search for the item. Some of these links go through an affiliate tracking service (Impact), which lets the store know the visit came from Amari. We may earn a commission on purchases, at no extra cost to you. We don't receive your purchase details.
- Once you're on a store's site, its own privacy policy applies.

---

## 7. Signing in

You can use Amari without an account.

- **Email:** we send you a one-time code or a sign-in link. You can also set a password.
- **Sign in with Apple or Google:** we receive the account identifier, and the email address and name you choose to share. If you use Apple's "Hide My Email", we receive a private relay address instead. We use your first name only to greet you.
- To stop automated abuse of sign-in, we use Cloudflare Turnstile, which checks that a person, not a bot, is signing in. It doesn't use cookies to track you across sites.

---

## 8. Notifications

- **Reminders** (dinner time, shopping, use-soon, cooking timers) are scheduled on your phone. They don't need our servers.
- **Notifications from Amari:** if you turn on notifications, your device's push address is stored with your account so we can send you messages about your plan or replies to your feedback. Messages are delivered by Apple Push Notification service, or by your browser's push service for the installed web app.
- **News from Amari** (new recipes and features) is a separate choice, off unless you turn it on.
- Notifications never mention your weight, goals, allergies or calories.
- Turning notifications off removes your push address from our servers.

---

## 9. App updates

The iPhone app downloads improvements to its own web content (the screens, text and recipe data) from askamari.us when they're available. This sends no information about you beyond the technical data any download involves (see section 2.2).

---

## 10. How we use information, and our legal bases

We use your information to:
- provide Amari: suggestions, scans, plans, shopping lists, Ask Amari and recipes (**performance of our contract with you**)
- keep your information in sync across your devices if you sign in (**contract**)
- use your allergies, diets, goals and weight to tailor suggestions and warnings (**your explicit consent**, which you give by entering them and can withdraw by removing them)
- send your information to an AI service for scanning, Ask Amari and new recipes (**your consent**, asked in the app)
- understand how Amari is used, if you turn analytics on (**your consent**)
- find and fix bugs and keep Amari fast and secure, including crash reports, logs and fair-use limits (**our legitimate interests** in a working, secure service; you can turn crash reports off)
- reply to your feedback and send notifications you turned on (**contract** and **consent**)
- comply with the law and enforce our terms (**legal obligation** and **legitimate interests**)

We don't make decisions about you that have legal or similarly significant effects based solely on automated processing.

---

## 11. Who we share information with

We share information only with service providers who process it for us under contract, and only as needed for the purposes above:

| Provider | What they do for us | Information involved |
|---|---|---|
| **Supabase** (United States) | Accounts, database, server functions | Account details and the app information you sync |
| **Cloudflare** (global) | Website and app hosting, recipe images, bot protection (Turnstile), AI models (Workers AI) | Connection data; photos and questions as described in sections 4 and 5 |
| **Google** (United States) | AI models (Gemini) as a backup and for writing new recipes; Google sign-in, if you use it | As described in sections 4, 5 and 7 |
| **Apple** | App distribution, Sign in with Apple, push notifications | As described in sections 7 and 8 |
| **Sentry** (United States) | Crash reports and performance monitoring | The scrubbed error details described in section 2.2. No account details |
| **Instacart** | Shopping pages you choose to open | Item names and amounts |
| **Email delivery provider** | Sign-in codes and links | Your email address |
| **Browser push services** (for example Apple, Google, Mozilla) | Delivering notifications in the installed web app | Push address and the notification text |

We may also disclose information if the law requires it, to protect anyone's safety or rights, to investigate fraud or abuse, or as part of a merger, acquisition or sale of assets, in which case we'll tell you and this policy will continue to apply.

**We don't sell or "share" personal information** as those terms are defined in US state privacy laws, and we don't use it for targeted advertising.

---

## 12. Where information is processed

Our database is hosted by Supabase in the United States (Ohio). Cloudflare serves the website and app from data centres around the world. AI requests are processed by Cloudflare and Google, mainly in the United States. If you're outside the United States, your information is transferred there. Where the law requires it (for example from the EU, EEA or UK), we rely on our providers' safeguards for these transfers, such as the European Commission's Standard Contractual Clauses and, where they're certified, the EU-US Data Privacy Framework.

---

## 13. How long we keep information

| Information | How long |
|---|---|
| Your synced app information and account | Until you delete your account |
| Guest IDs (never signed in) with no activity | Deleted automatically after 30 days |
| Scan records and feedback | Until you delete your account |
| Usage events (analytics) | 13 months, then deleted automatically |
| Crash and error reports | 90 days, then deleted automatically (Sentry: up to 90 days) |
| Server logs | 30 days, then deleted automatically |
| Fair-use counters | Daily and monthly counts, kept with your account; short-term rate-limit records are deleted after 1 day |
| Push addresses | Until you turn notifications off, delete your account, or 9 months after your device last checked in |
| Photos and Ask Amari conversations | Not stored |
| Recipes Amari wrote on request | Kept without your name, as part of the recipe collection |
| Backups | Deleted data may remain in our providers' backups for a limited period (typically up to 7 days for daily backups) before it's overwritten |

---

## 14. Your choices and rights

**In the app, at You → Privacy and data, you can:**
- **Export your data**: download everything Amari holds about you on your device as a file.
- **Delete your account and data**: this deletes your account and everything stored with it on our servers, signs you out, and clears the app on that device.
- **Turn analytics on or off**, and **turn crash reports on or off**.

You can also change or remove any preference, allergy, goal or weight entry at any time, and turn notifications off in the app or in your device settings.

**Your rights depend on where you live.** Depending on your location, you may have the right to:
- access the personal information we hold about you and get a copy
- correct it
- delete it
- restrict or object to how we use it
- receive it in a portable format
- withdraw consent at any time, without affecting what we did before
- not be discriminated against for using these rights

**EU, EEA and UK:** you can also complain to your local data protection authority.

**California and other US states with privacy laws:** you have the rights above. We don't sell or share personal information, don't use it for targeted advertising or profiling, and use sensitive information (such as allergies, diets and weight) only to provide the Service you asked for. You may use an authorised agent to make a request; we'll need to verify your request and the agent's authority. If we deny your request, you can appeal by replying to our answer.

To use a right that the app doesn't cover, email **support@askamari.us** from the address linked to your account, or tell us your account's email if you contact us from another address. We may need to verify your identity. We'll respond within 30 days (45 days where US state law allows), and tell you if we need more time.

---

## 15. Health, allergy and diet information

Allergies, diets, goals and weight can be sensitive. We use them only to suggest dinners, adjust portions and nutrition estimates, and warn you about conflicts. We don't use them for advertising, don't share them except as described in section 5 (when you use Ask Amari), and don't include them in analytics or notifications. Amari isn't a medical device and doesn't give medical advice.

---

## 16. Security

- Information is encrypted in transit (HTTPS) and at rest by our hosting providers.
- Database rules ensure each account can read only its own information.
- Server functions require a signed-in or guest session, check where requests come from, limit request sizes and apply fair-use limits.
- Secret keys are kept on our servers, never in the app.
- We collect only what Amari needs, and delete what we no longer need on the schedules above.

No system is perfectly secure. If a breach affects your information, we'll notify you and the authorities as the law requires.

---

## 17. Children

Amari is not directed to children. You must be at least 13 years old to use it (16 in the EU, EEA and UK, unless your country sets a lower age with parental consent). We don't knowingly collect personal information from children under these ages. If you believe a child has given us information, email support@askamari.us and we'll delete it.

---

## 18. Do Not Track and Global Privacy Control

We don't track you across other websites, so we don't change our behaviour based on Do Not Track signals. Because we don't sell or share personal information, a Global Privacy Control signal has nothing further to opt you out of, but we honour it as a request not to sell or share.

---

## 19. Changes to this policy

We'll update this policy when Amari changes. If a change is significant, we'll tell you in the app before it takes effect and, where the law requires it, ask for your consent again. The effective date at the top shows when it was last changed.

---

## 20. Contact

[Legal name of the operator]
[Postal address]
Email: **support@askamari.us**

If you're in the EU, EEA or UK and we're required to appoint a representative there, we'll list their contact details here.

---

## Appendix A: App Store privacy details (App Store Connect → App Privacy)

These answers match this policy. Update both together.

**Data used to track you:** None. Answer "No" to tracking.

**Data linked to you** (collected only when you use the feature or sign in):

| App Store category | Type | Purposes |
|---|---|---|
| Contact Info | Email Address; Name (first name, optional) | App Functionality |
| Health & Fitness | Health (allergies, diets, weight and goals, optional) | App Functionality, Product Personalization |
| User Content | Photos (scanned, not stored: still declare as collected); Customer Support (feedback); Other User Content (kitchen, preferences, Ask Amari questions) | App Functionality, Product Personalization |
| Identifiers | User ID; Device ID (push token) | App Functionality |
| Usage Data | Product Interaction (only with analytics on) | Analytics |
| Search History | Recipe search terms (only with analytics on) | Analytics, Product Personalization |
| Diagnostics | Crash Data; Performance Data; Other Diagnostic Data | App Functionality, Analytics |

**Data not collected:** Location, Contacts, Browsing History, Financial Info, Purchases (until paid plans exist), Sensitive Info (other than the health information above), Audio, Advertising Data.

## Appendix B: App Store review notes

- **Third-party AI (Guideline 5.1.2(i)):** the app asks for explicit permission, naming the AI providers and what's sent, before the first scan, the first Ask Amari message and the first new recipe.
- **Account deletion (Guideline 5.1.1(v)):** You → Privacy and data → Delete account deletes the account and its data from the server.
- **Privacy policy link (Guideline 5.1.1(i)):** in the app at You → About → Privacy Policy, and at https://app.askamari.us/privacy.
- **Sign in with Apple (Guideline 4.8):** offered next to Google sign-in.
- **Downloaded code (Guideline 2.5.2 / licence 3.3.1(B)):** the app downloads only web content (HTML, CSS, JavaScript and data) for its own web view, from askamari.us. It doesn't change the app's purpose or download native code.
