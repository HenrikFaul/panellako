# Ultra-Brutal Claude Prompt for PanelLakó Resident Profile, Sub-Unit, and Dashboard Redesign

## Role

You are a **senior product architect, resident-portal UX strategist, property-management domain expert, information-architecture specialist, and backend/frontend systems designer** for a condominium / apartment building resident platform.

Your task is to redesign and implement the **PanelLakó resident experience** so that it becomes:
- semantically correct,
- visually non-redundant,
- scalable across buildings and sub-units,
- friendly to owners who may own multiple apartments in the same building,
- and capable of handling resident profile data, communication, balances, payments, and building-related information in a clean, structured way.

This is not just a UI cleanup task. This is a **domain model correction, information architecture redesign, and dashboard simplification task**.

---

## Primary problem to solve

The current interface repeats the building address far too many times on the main screen.

The user is seeing the same address written redundantly about six times at the top of the page. That is excessive and should be eliminated.

The UI should clearly emphasize only the following core facts:
1. The exact building / property address where the resident registration is attached.
2. The exact sub-unit identifier associated with the registration.
3. The floor and door / apartment unit information.
4. The resident profile and legal/operational identity behind that registration.

All other repeated appearances of the same address should be removed or demoted into a single canonical location in the interface.

---

## Core product model

The system must model the domain with the following hierarchy:

- **Building / Property**
  - Example: `1134 Gidófalvy Lajos utca 9.`
- **Sub-unit / Apartment / Door / Floor**
  - Example: `3rd floor, door 12`, or another exact apartment identifier.
- **Resident profile**
  - The human profile belonging to one or more sub-units.
- **Account / tenancy / ownership relation**
  - The relationship between the resident profile and the building + sub-unit(s).

You must assume that **one resident profile may belong to multiple sub-units within the same building**.
This is not just allowed, it should be supported explicitly, because one person may own or manage multiple apartments at the same address.

However:
- those sub-units must be constrained to the same building/property context,
- and the UI must not confuse one building with another.

---

## Important domain rule

A resident profile must be able to register and manage:
- one building,
- multiple sub-units within that building,
- and the contact and operational data attached to that profile.

This means:
- the profile is not a generic “one address only” record,
- it is a **building-scoped identity with potentially multiple linked sub-units**.

For example:
- Building: `1134 Gidófalvy Lajos utca 9.`
- Profile: `Kiss Péter`
- Units:
  - `1. emelet 4. ajtó`
  - `2. emelet 8. ajtó`

This must be supported if the business logic allows it.

---

## Required redesign goals

You must design the interface and data model so that the resident can:
- see the correct canonical address once,
- see the exact registered sub-unit(s),
- manage multiple linked sub-units,
- edit profile data,
- see messages and communication history,
- see financial balance and monthly payment history,
- see emergency contact data,
- and access any additional resident portal features that modern property/resident systems commonly include.

---

## Required resident profile fields

The resident profile / account area must support editing at least the following fields:

### Identity and contact
- Name.
- Email address.
- Phone number.
- Alternative contact email if needed.
- Emergency contact name.
- Emergency contact phone number.
- Relationship to emergency contact.
- Optional preferred language.
- Optional notification preferences.

### Building and unit relation
- Building / property association.
- One or more registered sub-units under the same building.
- Floor and door / unit identifier.
- Ownership type or residency type if relevant:
  - owner,
  - tenant,
  - co-owner,
  - legal representative,
  - family member / delegate,
  - other authorized resident.

### Operational and account data
- Current balance.
- Monthly payment amount.
- Payment history.
- Open invoices or obligations.
- Message history.
- Notice history.
- Resident-to-management correspondence history.
- Optional maintenance requests.
- Optional document access.
- Optional announcements subscription.

---

## UI problem to fix

The dashboard currently repeats the building title / address too many times.

You must redesign the page so that:
- the address appears once in the most important place,
- the sub-unit information is shown clearly but not redundantly,
- the resident profile page contains the editable personal data,
- the main screen is focused on useful actions rather than repeated labels.

### Remove redundancy
The following must be avoided:
- showing the same address six times,
- repeating the building name in the page title, card title, hero header, breadcrumb, sidebar current building panel, and content heading all at once,
- using the same information as decorative text and again as functional text.

### Canonical display strategy
Use a single canonical display structure:
- one main hero title for the building,
- one subtitle or metadata line for building context,
- one resident identity block,
- one unit registration block,
- and then the actionable dashboard sections below.

---

## Information architecture requirements

You must restructure the main dashboard into clear sections.

### Recommended sections
1. **Building overview**
   - canonical building name/address.
   - building context.
   - maybe one short supporting line.

2. **Registered unit(s)**
   - all linked sub-units inside this building.
   - floor + door / apartment identifiers.
   - ability to add or switch units if authorized.

3. **Resident profile**
   - editable personal and contact details.
   - emergency contact.
   - notification preferences.
   - linked unit ownership / occupancy relations.

4. **Messages**
   - messages received.
   - messages sent.
   - management messages.
   - resident-to-resident or resident-to-manager communication if applicable.

5. **Financials**
   - current balance.
   - monthly dues.
   - payment history.
   - invoices / arrears / settled items.

6. **Documents and notices**
   - building notices.
   - announcements.
   - agreements.
   - forms.
   - community documents if available.

7. **Requests and service**
   - maintenance requests.
   - issue reporting.
   - service status.
   - follow-up notes if supported.

---

## Additional features to research and include

You must research and suggest relevant features commonly found in modern resident portals and property management systems, and determine whether they belong in the PanelLakó “My apartment / My profile” area.

Based on modern resident portal patterns, the following are highly relevant:
- payments and account history,
- maintenance requests,
- document access,
- community announcements,
- resident messaging,
- notification settings,
- contact update forms,
- multiple property / multiple unit support,
- service alerts,
- survey / feedback tools,
- event or community updates,
- secure login / password reset / authentication options,
- mobile-friendly access,
- push or email notification preferences.

Do not blindly add all of them. Evaluate each feature and decide:
- is it essential,
- is it optional,
- is it better placed elsewhere,
- or should it be postponed.

But you must explicitly consider them as possible resident-profile menu items.

---

## Resident profile menu design

The resident profile menu should support editing and viewing at least these categories:

### 1. Personal data
- name,
- email,
- phone,
- preferred contact method,
- language if applicable.

### 2. Emergency contact
- name,
- phone,
- relationship,
- optional secondary emergency contact.

### 3. Building and unit links
- linked building,
- linked apartment(s),
- floor/door metadata,
- unit ownership or occupancy permissions,
- ability to request new unit linkage if the user owns multiple apartments.

### 4. Messages
- inbox,
- sent messages,
- read/unread state,
- message threading,
- manager messages,
- service notices.

### 5. Financial information
- current balance,
- monthly payment totals,
- payments made,
- payment receipts,
- due dates,
- outstanding items,
- historical ledger.

### 6. Notifications
- email notifications,
- SMS notifications,
- app notifications,
- emergency alerts,
- payment reminders,
- announcement delivery preferences.

### 7. Documents
- building documents,
- forms,
- agreements,
- receipts,
- notices,
- archived files.

### 8. Requests
- maintenance requests,
- problem reports,
- status tracking,
- attachments and photos,
- follow-up notes.

---

## Data model requirements

You must propose a robust data model with explicit entities and relations.

### Suggested entities
- Building
- Unit / SubUnit
- ResidentProfile
- ResidentUnitLink
- Message
- MessageThread
- Payment
- Balance
- Invoice
- EmergencyContact
- Document
- MaintenanceRequest
- NotificationPreference
- AuthorizationRole
- OwnershipRelation
- ResidencyRelation

### Key data rules
- A ResidentProfile can have multiple ResidentUnitLink records.
- Each ResidentUnitLink must reference exactly one Building.
- A Building may have many Units.
- A Unit may belong to one or more authorization records depending on business rules.
- A ResidentProfile must not be forced into only one unit if the business model supports multiple units.
- The UI and backend must always know the active unit context when showing balance, messages, and notices.

---

## UI copy and content rules

You must rewrite the interface so that:
- titles are short and meaningful,
- subheadings are not duplicates of the title,
- building address is shown once in the primary location,
- unit identifiers are shown where operationally necessary,
- all repeated strings are removed unless they add new meaning.

### Example of bad copy
- repeated building name in banner,
- same address repeated in hero, breadcrumb, sidebar, and section header,
- unit label duplicated in every card.

### Example of good copy
- `Building: 1134 Gidófalvy Lajos utca 9.`
- `Registered unit(s): 3rd floor, Door 12; 4th floor, Door 5`
- `Resident profile: Kovács Anna`
- `Balance: HUF 12,400`
- `Messages: 4 unread`
- `Emergency contact: +36 ...`

Only include the address where it adds meaning.

---

## Multi-unit behavior

You must explicitly support the case where one resident owns or manages multiple sub-units in the same building.

### Required behavior
- The resident should be able to see all linked apartments under the same property.
- The profile should support adding multiple units if authorized.
- Each unit should be individually identifiable.
- Financials should be viewable per unit and also aggregated at profile level if helpful.
- Messages should be filterable by unit or shown across the profile with clear labels.
- The resident should understand which unit a given action or balance belongs to.

### UI requirement
Add a unit switcher or unit selector if needed:
- `Current unit`
- `Switch unit`
- `Add another unit`
- `Request unit access`
- `View all units`

But never let the unit switcher create confusion or duplicate building titles.

---

## Message and communication requirements

The resident should be able to:
- see messages received from management,
- see messages sent by the resident,
- distinguish read/unread state,
- attach messages to a unit if relevant,
- filter by building or unit,
- and optionally see message history.

This should support common resident portal behavior such as:
- property announcements,
- payment reminders,
- service updates,
- maintenance follow-ups,
- emergency notices,
- community notices.

---

## Financial module requirements

The resident should be able to view:
- current balance,
- monthly dues,
- payment due date,
- payment history,
- receipts,
- outstanding obligations,
- aggregated or per-unit financial status.

If there are multiple units:
- the balance must be shown clearly per unit,
- and optionally in aggregated form,
- but never mixed ambiguously.

---

## Suggested resident portal enhancements to consider

You must think beyond the current screen and propose any relevant features that would make the profile area genuinely useful in a residential management app.

Potential enhancements to consider:
- recurring payment setup,
- invoice download,
- payment reminder settings,
- document archive,
- announcement subscription,
- issue reporting,
- maintenance status tracking,
- emergency alert preferences,
- contact data verification,
- profile completeness indicator,
- resident authorization management,
- digital consent / terms acceptance,
- important dates or renewal reminders.

Do not force all of these into the first release, but include them in your evaluation and prioritization.

---

## Validation rules

Your solution must pass these checks:
- The building title is not duplicated excessively.
- The resident profile supports name, email, phone, and emergency contact data.
- The resident can have multiple units under the same building.
- The UI distinguishes building-level, unit-level, and profile-level data.
- Messages, financials, and notifications are shown in appropriate sections.
- The design is technically sound and scalable.
- The resident menu is genuinely useful, not just a placeholder.

---

## Deliverable requirements

Produce:
1. A redesigned information architecture.
2. A resident profile data model.
3. A cleaned-up dashboard content strategy.
4. A settings/profile menu specification.
5. A unit-linking strategy.
6. A financial/messaging/notification module breakdown.
7. A prioritized feature list with MVP vs later-phase ideas.
8. A clear recommendation on whether one profile may have multiple units.

My recommendation is that **yes, one resident profile should be allowed to link multiple sub-units within the same building**, because real property ownership and residence patterns often require it.

---

## Final instruction

At the end of your work, use the helper prompt for coordination and further refinement:

`https://github.com/HenrikFaul/panellako/blob/main/SEO/00_MASTER_CONTROLLER_PROMPT.md`

If needed, consult it for additional orchestration, decomposition, or prompt hierarchy guidance before finalizing the solution.

End of prompt.
