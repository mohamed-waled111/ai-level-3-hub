# AI Level 3 Hub

Build a modern, professional web application that works as a private student platform for Level 3 students at the Faculty of Artificial Intelligence.

IMPORTANT:

This is NOT an official university website.

It is a private student-to-student academic platform for organizing lectures, quizzes, exams, and summaries.

The platform should feel like a polished modern educational SaaS product, but NOT like an "AI-themed" website.

Avoid the typical AI visual style:

- No excessive purple/blue gradients

- No glowing neon effects

- No futuristic sci-fi UI

- No excessive glassmorphism

- No unnecessary AI icons

Instead, use a calm, premium academic visual identity with:

- Warm off-white / ivory background

- Deep charcoal text

- Muted burgundy / terracotta as the main accent

- Soft beige / sand secondary colors

- Subtle olive or sage green for success states

- White cards

- Thin borders

- Soft shadows

- Excellent typography

- Generous spacing

- Subtle micro-interactions

The design should feel like a combination of:

modern university portal + premium productivity app + modern educational platform.

==================================================

1. CORE COURSES

==================================================

The platform should contain exactly these 6 courses:

1. Computational Vision

   Code: RB311

2. Fundamentals of Deep Learning

   Code: ML311

3. Parallel and Distributed Computing

   Code: BC311

4. Introduction to Algorithms

   Code: BC312

5. Software Development for Mobile Devices

   Code: ES311

6. Data Analysis

   Code: MA312

Do NOT include Signal Processing.

==================================================

2. HOME PAGE

==================================================

Create a beautiful dashboard/home page.

Header:

- Platform logo/name

- "Level 3 • Faculty of Artificial Intelligence"

- Small indication that this is a student platform

- Navigation:

  Home

  Courses

  My Progress

  Admin (only visible to admin)

Hero section:

Title:

"Level 3 Academic Hub"

Subtitle:

"Your lectures, quizzes, exams, and study summaries — all in one place."

Add a small academic status section such as:

"6 Courses"

"Lecture Resources"

"Practice Quizzes"

"Mock Exams"

Then display the six courses as individual cards in a responsive grid.

Each course card should contain:

- Course code

- Course title

- Short description

- Number of lectures

- Number of quizzes

- Number of exams

- Progress indicator

- "Open Course" button

Each card should have a subtle unique visual accent, but keep the overall visual identity consistent.

Example:

RB311

Computational Vision

"Explore image processing, visual perception, and computer vision concepts."

[12 Lectures] [24 Quizzes]

[Open Course →]

Cards should have:

- clean hover animation

- slight elevation

- subtle border

- no excessive animations

==================================================

3. COURSE PAGE

==================================================

When the user clicks a course, navigate to:

/courses/:courseId

Course page header:

Course Code

Course Title

Example:

RB311

Computational Vision

"Organize your learning material by lecture."

Below the header, display the lectures.

Each lecture should be represented by a clean expandable section or lecture card.

For every lecture, provide THREE main resource cards:

--------------------------------

CARD 1 — QUIZZES

--------------------------------

Title:

"Lecture Quiz"

Description:

"Practice with questions specifically based on this lecture."

Example:

Quiz — Lecture 1

Show:

- Number of questions

- Difficulty

- Estimated time

- Completion status

Button:

"Start Quiz"

When clicked, the user should be able to choose between two modes:

1. Exam Mode

2. Instant Feedback Mode

Exam Mode:

- Answer all questions

- Do NOT reveal correctness immediately

- Timer can be displayed

- Submit at the end

- Show complete result after submission

Instant Feedback Mode:

- Answer one question

- Immediately show whether the answer is correct

- Show the correct answer

- Show explanation

- Then move to the next question

--------------------------------

CARD 2 — EXAM

--------------------------------

Title:

"Lecture Exam"

Description:

"A longer assessment covering the lecture."

Example:

Exam — Lecture 1

This should contain more questions than the regular quiz.

Display:

- Number of questions

- Estimated duration

- Difficulty

- Attempt status

Button:

"Start Exam"

Before starting, allow the same two modes:

Exam Mode

Instant Feedback Mode

Exam Mode:

- Timer

- No immediate correction

- Submit at the end

- Final score

- Review answers

Instant Feedback:

- Immediate correction

- Explanation after each answer

--------------------------------

CARD 3 — SUMMARY

--------------------------------

Title:

"Lecture Summary"

Description:

"Review the most important concepts from this lecture."

Button:

"Read Summary"

The summary page should support:

- Headings

- Paragraphs

- Bullet points

- Important concepts

- Definitions

- Examples

- Formulas

- Code snippets where necessary

- Images/diagrams if uploaded

Make the reading experience clean and comfortable.

==================================================

4. LECTURE STRUCTURE

==================================================

Every course can contain an unlimited number of lectures.

Example:

Computational Vision

Lecture 1

 ├── Quiz — Lecture 1

 ├── Exam — Lecture 1

 └── Summary — Lecture 1

Lecture 2

 ├── Quiz — Lecture 2

 ├── Exam — Lecture 2

 └── Summary — Lecture 2

Lecture 3

 ├── Quiz — Lecture 3

 ├── Exam — Lecture 3

 └── Summary — Lecture 3

etc.

The same structure applies to all six courses.

Do NOT hardcode a fixed number of lectures.

The admin should be able to create unlimited lectures.

==================================================

5. QUIZ SYSTEM

==================================================

Build a complete interactive quiz engine.

Question types:

- Multiple Choice Questions

- True / False

Each question should support:

- Question text

- Optional image

- Multiple choices

- Correct answer

- Explanation

- Difficulty

- Optional reference/lecture section

Question difficulty:

- Easy

- Medium

- Hard

Quiz interface:

Top:

Course

Lecture

Quiz title

Question counter

Progress bar

Timer if enabled

Center:

Question

Answer choices as large clickable cards.

Bottom:

Previous

Next

For Exam Mode:

Do not show correctness until submission.

For Instant Feedback Mode:

Immediately show:

✓ Correct

or

✕ Incorrect

Then display:

"Explanation"

==================================================

6. EXAM SYSTEM

==================================================

Create a separate exam engine.

Exam should support:

- Larger question sets

- Randomized questions

- Timer

- Question navigation

- Question palette

- Mark question for review

- Previous / Next

- Submit Exam

Exam result page:

Show:

Score

Percentage

Correct Answers

Wrong Answers

Unanswered

Time Used

Then provide:

"Review Answers"

Each reviewed question should show:

- User answer

- Correct answer

- Explanation

==================================================

7. PROGRESS SYSTEM

==================================================

Create a "My Progress" dashboard.

Show:

Overall Progress

Course-by-course progress:

Computational Vision

████████░░ 80%

Fundamentals of Deep Learning

██████░░░░ 60%

etc.

Statistics:

- Quizzes completed

- Exams completed

- Average quiz score

- Average exam score

- Questions answered

- Correct answers

- Study progress

Also include:

"Recently Completed"

and

"Continue Learning"

The progress should be calculated automatically from user activity.

==================================================

8. ADMIN SYSTEM

==================================================

There should be an Admin area that ONLY the platform owner/admin can access.

The normal student interface should NOT expose editing controls.

Create:

/admin

Admin dashboard:

Overview:

- Total courses

- Total lectures

- Total quizzes

- Total exams

- Total questions

Admin navigation:

Dashboard

Courses

Lectures

Quizzes

Exams

Summaries

Question Bank

==================================================

9. ADMIN COURSE MANAGEMENT

==================================================

Admin can:

Create course

Edit course

Delete course

Course fields:

- Course code

- Course title

- Description

- Icon

- Accent color

==================================================

10. ADMIN LECTURE MANAGEMENT

==================================================

Admin can:

Add Lecture

Edit Lecture

Delete Lecture

Reorder Lectures

Lecture fields:

- Lecture number

- Lecture title

- Description

- Optional lecture file

- Summary

Example:

Lecture 01

Introduction to Computer Vision

==================================================

11. QUIZ MANAGEMENT

==================================================

Admin can create/edit/delete quizzes.

Quiz editor:

Quiz title

Lecture

Description

Question count

Question editor:

Question:

[Text editor]

Question type:

[MCQ / True-False]

Options:

A

B

C

D

Correct Answer

Explanation

Difficulty

Optional image

Admin should be able to:

- Add question

- Edit question

- Delete question

- Duplicate question

- Reorder questions

==================================================

12. EXAM MANAGEMENT

==================================================

Admin can create exams independently from quizzes.

Exam fields:

- Exam title

- Course

- Lecture

- Number of questions

- Duration

- Difficulty

Questions can be selected manually or randomly from the question bank.

Allow:

"Generate Exam from Question Bank"

For example:

Select:

Course: Data Analysis

Lecture: 3

Questions: 30

Difficulty:

20% Easy

50% Medium

30% Hard

Then generate the exam.

==================================================

13. SUMMARY MANAGEMENT

==================================================

Admin should have a rich text editor for lecture summaries.

Support:

# Heading

## Subheading

Paragraphs

Bullet lists

Numbered lists

Bold

Italic

Highlight

Code blocks

Tables

Images

Formulas / mathematical notation

The admin can save and publish the summary.

==================================================

14. QUESTION BANK

==================================================

Create a centralized Question Bank.

Admin can search/filter questions by:

Course

Lecture

Question type

Difficulty

Used / Unused

Actions:

Edit

Delete

Duplicate

Preview

Allow questions to be reused in multiple exams.

==================================================

15. DATA MODEL

==================================================

Use a proper relational structure.

Entities:

Course

Lecture

Quiz

QuizQuestion

Exam

ExamQuestion

Question

Summary

User

QuizAttempt

ExamAttempt

AttemptAnswer

Progress

Relationships:

Course

 └── Lectures

      ├── Quiz

      │    └── Questions

      ├── Exam

      │    └── Questions

      └── Summary

==================================================

16. USER / ADMIN ACCESS

==================================================

Students should have normal access to:

- Courses

- Lectures

- Quizzes

- Exams

- Summaries

- Progress

Only the admin can:

- Create

- Edit

- Delete

- Upload

- Publish

- Manage questions

- Manage exams

- Manage summaries

Implement proper authentication and authorization.

There should be an Admin Role.

Never rely only on hiding the Admin button from students.

Enforce authorization on the backend/database level as well.

==================================================

17. FILE UPLOADS

==================================================

Admin should be able to upload:

PDF

PPTX

DOCX

Images

Files can be attached to lectures.

For example:

Lecture 01

├── Lecture PDF

├── Quiz

├── Exam

└── Summary

Do not automatically generate quizzes from uploaded files unless explicitly requested by the admin.

The uploaded files are resources for students.

==================================================

18. UI DESIGN SYSTEM

==================================================

The visual identity is extremely important.

DO NOT make it look like a generic AI startup.

Avoid:

- Purple gradients

- Blue/purple neon

- Excessive glowing

- Futuristic backgrounds

- Huge gradient text

- Excessive rounded elements

- Overuse of glassmorphism

Preferred visual direction:

Background:

Warm Ivory / Off White

Cards:

White

Primary:

Deep Burgundy / Muted Wine

Secondary:

Terracotta / Warm Clay

Accent:

Muted Sage Green

Text:

Deep Charcoal

Borders:

Soft Warm Gray

Example palette:

#F7F4EF

#FFFFFF

#292725

#6B2634

#A65D4A

#7A8B70

#DDD7CE

Use the colors carefully.

The interface should feel:

- Academic

- Premium

- Calm

- Mature

- Modern

- Trustworthy

- Comfortable for long study sessions

==================================================

19. TYPOGRAPHY

==================================================

Use a modern highly readable font.

Suggested:

Inter

Manrope

DM Sans

Use:

- Strong typography hierarchy

- Large course titles

- Comfortable paragraph spacing

- Clear labels

The platform must be highly readable on both desktop and mobile.

==================================================

20. RESPONSIVE DESIGN

==================================================

Fully responsive.

Desktop:

3-column course grid

Tablet:

2-column grid

Mobile:

1-column layout

Quiz interface must work perfectly on mobile.

Admin dashboard should also be responsive.

==================================================

21. MICRO INTERACTIONS

==================================================

Use subtle animations only.

Examples:

- Card hover elevation

- Button hover

- Smooth page transitions

- Progress bar animation

- Question transition

- Success feedback animation

Keep animations professional and fast.

==================================================

22. HOME PAGE STRUCTURE

==================================================

Final homepage layout:

HEADER

Logo / Platform Name

Courses

Progress

Admin

--------------------------------

HERO

Level 3 Academic Hub

"Everything you need to study smarter."

[Explore Courses]

--------------------------------

QUICK STATS

6 Courses

XX Lectures

XX Quizzes

XX Exams

--------------------------------

COURSES

[Computational Vision]

[Fundamentals of Deep Learning]

[Parallel & Distributed Computing]

[Introduction to Algorithms]

[Software Development for Mobile Devices]

[Data Analysis]

--------------------------------

CONTINUE LEARNING

Show recently accessed lectures.

--------------------------------

FOOTER

"Built by students, for students."

Add a small disclaimer:

"Independent student platform — not affiliated with the university."

==================================================

23. COURSE PAGE STRUCTURE

==================================================

COURSE HEADER

RB311

Computational Vision

Description

Progress: 42%

--------------------------------

LECTURES

LECTURE 01

Introduction to Computer Vision

[Quiz]

[Exam]

[Summary]

LECTURE 02

...

--------------------------------

COURSE PROGRESS

Quizzes Completed

Exams Completed

Summaries Read

==================================================

24. RESULT PAGE

==================================================

After finishing a quiz/exam:

"Assessment Complete"

Large score:

82%

Then:

Correct       24

Incorrect      6

Unanswered    0

[Review Answers]

[Try Again]

[Back to Course]

==================================================

25. IMPORTANT UX RULES

==================================================

The application should feel like a real production-ready academic platform.

Do NOT create a simple CRUD dashboard.

Focus heavily on:

- UX

- Information hierarchy

- Navigation

- Readability

- Assessment experience

- Progress visualization

- Clean responsive layouts

The user should be able to understand where they are within 2 seconds.

Every page should clearly show:

Course → Lecture → Resource

Example breadcrumb:

Courses / Data Analysis / Lecture 04 / Quiz

==================================================

26. TECHNICAL REQUIREMENTS

==================================================

Use a modern production-ready stack.

Preferred:

Frontend:

React

TypeScript

Tailwind CSS

shadcn/ui

Framer Motion

Backend:

Supabase

Use:

- Supabase Auth

- PostgreSQL

- Supabase Storage

- Row Level Security

Implement proper database relationships.

Use reusable components.

Create a clean folder structure.

Do not hardcode quiz data into components.

All courses, lectures, questions, exams and summaries should come from the database.

==================================================

27. INITIAL DATABASE CONTENT

==================================================

Initially create the six courses:

RB311 — Computational Vision

ML311 — Fundamentals of Deep Learning

BC311 — Parallel and Distributed Computing

BC312 — Introduction to Algorithms

ES311 — Software Development for Mobile Devices

MA312 — Data Analysis

Create them as empty courses with zero lectures.

The admin will add the lectures, quizzes, exams and summaries later.

==================================================

28. FINAL REQUIREMENT

==================================================

Build the complete UI and application architecture, not just a landing page.

The first version should include:

✓ Homepage

✓ Course cards

✓ Course pages

✓ Lecture structure

✓ Quiz interface

✓ Exam interface

✓ Instant feedback mode

✓ Exam mode

✓ Results page

✓ Answer review

✓ Progress dashboard

✓ Admin dashboard

✓ Course management

✓ Lecture management

✓ Quiz management

✓ Exam management

✓ Question bank

✓ Summary editor

✓ File uploads

✓ Authentication

✓ Admin authorization

✓ Responsive design

Make the application feel like a polished private academic platform built specifically for Level 3 Artificial Intelligence students.

The design should be distinctive, mature, academic, and visually comfortable rather than looking like another generic AI SaaS product.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ba5a365d-0b66-4f30-b796-8e353c26fc89).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
