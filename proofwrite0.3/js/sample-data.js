/* =========================================================
   Sample data — hardcoded class of 12 students.
   This is the "fixture" data for the demo. In production
   this would come from a backend API.

   Each student has:
   - identity fields (name, email)
   - summary metrics (wordCount, activeMinutes, wpm, pastes, tabSwitches)
   - a flag level (green | yellow | red) + human-readable reasons
   - the essay text
   - a simulated event log (for the review page)
   - snapshots — reconstructed "how the text grew over time"
     stored as [timestampMs, fullText] pairs, used by the
     replay player.
   ========================================================= */

const ASSIGNMENT = {
  title: "Book Report: Bridge to Terabithia",
  prompt: "Describe the friendship between Jess and Leslie. What did they learn from each other? Use examples from the story to support your answer.",
  dueDate: "Fri, May 2",
  class: "Grade 5 / Ms. Carter",
  wordTarget: "250\u2013400 words",
};

/* Helper to generate believable typing-progression snapshots.
   We take a final essay and produce N intermediate snapshots that
   add characters progressively with some realistic pauses. */
function buildTypingSnapshots(finalText, totalMs, {jitter = 0.3} = {}) {
  const snapshots = [{t: 0, text: ""}];
  const targetLen = finalText.length;
  // Aim for ~60 snapshots spread across the session
  const numSnaps = 60;
  for (let i = 1; i <= numSnaps; i++) {
    const progress = i / numSnaps;
    // Slight random jitter so pacing isn't perfectly linear
    const jitterFactor = 1 + (Math.random() - 0.5) * jitter;
    const t = Math.min(totalMs, totalMs * progress * jitterFactor);
    const len = Math.round(targetLen * progress);
    snapshots.push({t, text: finalText.slice(0, len)});
  }
  snapshots.push({t: totalMs, text: finalText});
  // sort just in case jitter reordered
  snapshots.sort((a, b) => a.t - b.t);
  return snapshots;
}

/* For a "paste-in" student, snapshots jump from empty to full
   with only minor trailing edits. */
function buildPasteSnapshots(pastedText, trailingEdits, totalMs) {
  const snapshots = [{t: 0, text: ""}];
  // Brief pause, then the whole thing appears
  snapshots.push({t: 3000, text: ""});
  snapshots.push({t: 3200, text: pastedText});
  // then some small cosmetic edits
  let current = pastedText;
  const editPoints = Math.min(8, trailingEdits.length);
  for (let i = 0; i < editPoints; i++) {
    const t = 4000 + ((totalMs - 5000) * (i + 1) / editPoints);
    current = current + trailingEdits[i];
    snapshots.push({t, text: current});
  }
  snapshots.push({t: totalMs, text: current});
  return snapshots;
}

const SUBMISSIONS = [
  {
    id: 1,
    name: "Amelia Brooks",
    email: "abrooks@mcpsmd.net",
    flag: "green",
    reasons: [],
    wordCount: 312,
    activeMs: 28 * 60 * 1000,
    wpm: 14,
    pastes: 0,
    tabSwitches: 0,
    submittedAt: "Apr 23, 7:42 PM",
    essay: `Jess and Leslie's friendship is one of the most special parts of Bridge to Terabithia. At the start of the book, Jess is a lonely boy who loves to draw but feels like nobody in his family really understands him. His dad wants him to do chores and be tough, and his sisters tease him. Then Leslie moves in next door and everything changes.

Leslie is different from everyone Jess knows. She reads a lot of books, she runs faster than all the boys, and she isn't afraid to be herself even when other kids make fun of her for not owning a TV. At first Jess is surprised by her, but soon they become best friends.

Together they make a secret kingdom in the woods called Terabithia. This is where I think they learn the most from each other. Leslie teaches Jess to use his imagination and to believe that he can be brave and strong in his own way. She helps him see that being an artist is something to be proud of, not hide. Jess teaches Leslie too, I think. He shows her what it is like to have a real friend who listens, because she did not have many friends at her old school.

When Leslie dies, it is the saddest part of the whole book. But even then, Jess remembers what she taught him. He builds a bridge across the creek so his little sister May Belle can come to Terabithia too. This shows that Leslie's lessons did not go away. Jess takes what he learned from her and passes it on to someone else.

I think the friendship between Jess and Leslie shows that the best friends help you become a better version of yourself.`,
    events: [
      {t: 0, type: "session_start", label: "Session started"},
      {t: 180000, type: "keystroke", label: "Typing (first paragraph)"},
      {t: 540000, type: "pause", label: "Paused 42s \u2014 thinking"},
      {t: 1200000, type: "keystroke", label: "Typing resumed"},
      {t: 1680000, type: "revision", label: "Revision: rewrote sentence"},
    ],
  },
  {
    id: 2,
    name: "Benjamin Chen",
    email: "bchen@mcpsmd.net",
    flag: "green",
    reasons: [],
    wordCount: 268,
    activeMs: 32 * 60 * 1000,
    wpm: 11,
    pastes: 0,
    tabSwitches: 1,
    submittedAt: "Apr 23, 8:15 PM",
    essay: `Jess and Leslie become friends in the book Bridge to Terabithia. Jess is a kid who likes to run and draw. Leslie is new to the school and she is really smart. She beats Jess in a race on the first day and at first Jess is upset but then they become friends.

They make up a place in the woods called Terabithia. They pretend it is a magic kingdom and they are the king and queen. This place is special because it is only for them and nobody else knows about it. When they are there they can be themselves and not worry about anything.

Leslie teaches Jess a lot of things. She teaches him about books and stories. She also teaches him that it is okay to be different and to think big thoughts. Jess is scared of a lot of things at the beginning but Leslie helps him feel braver.

Jess teaches Leslie too. He shows her around the school and helps her fit in. He is her first real friend. Leslie was new and she didn't have anyone before Jess.

Then something really sad happens. Leslie dies when she falls into the creek. Jess is very upset and angry for a long time. But he remembers what Leslie taught him about using his imagination. He builds a real bridge to Terabithia and brings his little sister there. I think this means Leslie's ideas live on in Jess.`,
    events: [
      {t: 0, type: "session_start", label: "Session started"},
      {t: 240000, type: "keystroke", label: "Typing"},
      {t: 900000, type: "blur", label: "Left page 38s"},
      {t: 938000, type: "focus", label: "Returned"},
      {t: 1800000, type: "keystroke", label: "Typing continued"},
    ],
  },
  {
    id: 3,
    name: "Chloe Davidson",
    email: "cdavidson@mcpsmd.net",
    flag: "green",
    reasons: [],
    wordCount: 345,
    activeMs: 41 * 60 * 1000,
    wpm: 12,
    pastes: 0,
    tabSwitches: 2,
    submittedAt: "Apr 23, 6:30 PM",
    essay: `In the book Bridge to Terabithia by Katherine Paterson, Jess Aarons and Leslie Burke have one of the best friendships I have ever read about. They are very different but they help each other in ways they never expected.

Jess is a boy who feels lost in his own family. His mom is always tired, his dad works long hours and does not really see him, and his sisters are not nice to him. The one thing Jess loves is drawing, but he keeps it a secret because he thinks his dad will be disappointed. He practices running all summer because he wants to be the fastest kid in fifth grade. But when school starts, a new girl named Leslie beats him in the race. He is mad at first but she is so nice that he can not stay mad.

Leslie is not like the other kids. Her family moved from the city and they do not have a TV. At first the other kids think this is weird but Leslie does not care what they think. She loves books and she has a big imagination. When she and Jess become friends, she invents a whole kingdom in the woods and calls it Terabithia. She and Jess are the rulers.

What I love about their friendship is that they learn from each other. Leslie teaches Jess to believe in his drawings and to have courage. Jess teaches Leslie about country life and how to stand up for herself when kids tease her. They both get braver because they have each other.

When Leslie dies trying to cross the creek to Terabithia alone, Jess is heartbroken. But he keeps Terabithia alive by bringing his little sister May Belle there. I think this shows that real friendship never really ends. The things Leslie taught Jess stay with him forever.`,
    events: [
      {t: 0, type: "session_start", label: "Session started"},
      {t: 120000, type: "keystroke", label: "Typing"},
      {t: 1080000, type: "blur", label: "Left page (55s)"},
      {t: 1135000, type: "focus", label: "Returned"},
      {t: 1800000, type: "revision", label: "Rewrote opening"},
      {t: 2100000, type: "blur", label: "Left page (23s)"},
    ],
  },
  {
    id: 4,
    name: "Derek Esposito",
    email: "desposito@mcpsmd.net",
    flag: "yellow",
    reasons: ["Left the page 4 times during writing.", "Pasted 1 short quote."],
    wordCount: 289,
    activeMs: 34 * 60 * 1000,
    wpm: 13,
    pastes: 1,
    tabSwitches: 4,
    submittedAt: "Apr 23, 9:20 PM",
    essay: `Bridge to Terabithia is about a boy named Jess and a girl named Leslie. They become best friends and create an imaginary place together. The book says they find "a secret place" in the woods where they rule together. That place is called Terabithia.

Jess is a lonely kid at the start. His family does not understand him and his only real friend is his music teacher Miss Edmunds. He likes to draw but he is embarrassed about it. Then Leslie moves in next door. Leslie is smart and brave. She doesn't care what other kids think of her. She is different and she makes Jess feel like being different is okay.

They spend all their time in Terabithia after school. It is their special place. They imagine that there are enemies to fight and creatures in the trees. Leslie's imagination is what makes it feel real.

Leslie teaches Jess a lot. She teaches him to read bigger books and to think about big questions. She makes him braver. Jess teaches Leslie too. He helps her learn how things work in the country since she grew up in the city. He is her first real friend.

The saddest part is when Leslie dies. She was trying to go to Terabithia by herself when the rope broke and she drowned in the creek. Jess is really sad and angry. But at the end, he builds a bridge so his sister May Belle can go too. He teaches May Belle to be the new queen of Terabithia.

This book made me think about how a friend can change your life even in a short time.`,
    events: [
      {t: 0, type: "session_start", label: "Session started"},
      {t: 300000, type: "keystroke", label: "Typing"},
      {t: 620000, type: "blur", label: "Left page (1m 12s)", level: "warn"},
      {t: 692000, type: "focus", label: "Returned"},
      {t: 1100000, type: "paste", label: "Pasted quote (18 chars)", level: "warn"},
      {t: 1450000, type: "blur", label: "Left page (31s)", level: "warn"},
      {t: 1481000, type: "focus", label: "Returned"},
      {t: 1820000, type: "blur", label: "Left page (47s)", level: "warn"},
      {t: 1867000, type: "focus", label: "Returned"},
      {t: 2100000, type: "blur", label: "Left page (22s)", level: "warn"},
    ],
  },
  {
    id: 5,
    name: "Elena Fontaine",
    email: "efontaine@mcpsmd.net",
    flag: "green",
    reasons: [],
    wordCount: 295,
    activeMs: 26 * 60 * 1000,
    wpm: 16,
    pastes: 0,
    tabSwitches: 0,
    submittedAt: "Apr 22, 4:45 PM",
    essay: `My favorite book this year was Bridge to Terabithia because of how real the friendship between Jess and Leslie felt. It made me think about my own friendships and what makes a good friend.

Jess starts the book feeling invisible in his own house. His three sisters ignore him or tease him, his dad only seems to notice when something goes wrong, and his mom is too tired to pay attention. The one thing that makes him feel like himself is drawing, but he hides his sketchbook because he thinks his dad would be angry if he saw it. Jess is also the fastest runner in his class, or at least he thinks he is until Leslie moves in.

Leslie is everything Jess is not. She is bold, loud when she wants to be, and not afraid of anyone. She comes from a family that is different from the families in their small town. Her parents are writers and they do not have a TV. The other kids make fun of her for this but Leslie doesn't care.

What makes their friendship special is that they both give each other something they needed. Leslie gives Jess confidence. She tells him his drawings are amazing. She invents Terabithia so that he can be a king and not just a boy who has to do chores. Jess gives Leslie something too. He gives her someone who believes her, who wants to be in her imaginary world with her, not think she is strange.

When Leslie dies it feels like a punch. But I think the book is showing us that friends change us forever. Jess is a different person at the end because of Leslie, and that is the real magic of Terabithia.`,
    events: [
      {t: 0, type: "session_start", label: "Session started"},
      {t: 90000, type: "keystroke", label: "Typing"},
      {t: 780000, type: "pause", label: "Paused 28s"},
      {t: 808000, type: "keystroke", label: "Resumed typing"},
      {t: 1500000, type: "revision", label: "Revised paragraph 2"},
    ],
  },
  {
    id: 6,
    name: "Felix Garrison",
    email: "fgarrison@mcpsmd.net",
    flag: "red",
    reasons: [
      "Wrote the entire essay as a single 284-word paste.",
      "Active writing time: 1 min 42 sec.",
      "No revisions or deletions after initial paste.",
    ],
    wordCount: 284,
    activeMs: 102 * 1000,
    wpm: 167,
    pastes: 1,
    tabSwitches: 2,
    submittedAt: "Apr 23, 10:58 PM",
    essay: `The friendship between Jess Aarons and Leslie Burke in Bridge to Terabithia is a profound exploration of how two fundamentally different individuals can complement one another and facilitate mutual personal growth. Jess, a reserved and artistically inclined boy constrained by his rural working-class environment, finds in Leslie an unexpected catalyst for self-discovery. Leslie, the newly arrived girl from a progressive intellectual family, brings with her a boundless imagination and fearless nonconformity that challenges the social norms of their community.

Their friendship is anchored by the creation of Terabithia, an imaginary kingdom in the woods accessible only by swinging across a creek on a rope. This shared imaginative space serves as a metaphor for the transformative power of connection. Within Terabithia, Jess is liberated from the confines of his family's expectations and discovers a confidence he did not know he possessed. Leslie, in turn, finds in Jess a kindred spirit who takes her seriously and participates in her imaginative world without judgment.

From Leslie, Jess learns to embrace his artistic talent and to believe that he is capable of bravery and leadership. Her fearlessness in the face of social ostracism teaches him the value of authenticity. From Jess, Leslie gains something equally vital: genuine friendship and acceptance, something she had lacked at her previous schools despite her intelligence and creativity.

The tragic death of Leslie represents not an ending but a transformation. Jess internalizes her lessons and passes them forward by initiating his younger sister May Belle into the kingdom of Terabithia. This act symbolizes the enduring nature of transformative friendship and the way in which the gifts we receive from loved ones continue to shape us long after they are gone.`,
    events: [
      {t: 0, type: "session_start", label: "Session started"},
      {t: 3200, type: "paste", label: "Paste: 1,847 characters", level: "alert"},
      {t: 42000, type: "blur", label: "Left page (8s)", level: "warn"},
      {t: 50000, type: "focus", label: "Returned"},
      {t: 68000, type: "keystroke", label: "Minor edit (2 chars)"},
      {t: 95000, type: "blur", label: "Left page (4s)", level: "warn"},
      {t: 99000, type: "focus", label: "Returned"},
      {t: 102000, type: "submit", label: "Submitted"},
    ],
  },
  {
    id: 7,
    name: "Grace Huang",
    email: "ghuang@mcpsmd.net",
    flag: "green",
    reasons: [],
    wordCount: 258,
    activeMs: 29 * 60 * 1000,
    wpm: 10,
    pastes: 0,
    tabSwitches: 1,
    submittedAt: "Apr 22, 6:20 PM",
    essay: `Jess and Leslie are the main characters in Bridge to Terabithia. They have a really cool friendship that changes both of them for the better.

Jess is kind of shy at first. He likes to draw and he likes to run. His family is not very nice to him and he does not have many friends. Then Leslie moves into the house next door and she becomes his friend.

Leslie is very different from Jess. She is not shy at all. She reads a lot of books and she is really good at imagining things. She beats Jess in a race on the first day of school. Jess is a little mad but he still wants to be her friend.

They go into the woods together and make up a place called Terabithia. It is their secret kingdom. They go there every day after school. They pretend there are monsters and they fight them together. Terabithia feels real when they are there.

In Terabithia, Jess learns to be brave. He used to be scared of a lot of things but Leslie helps him not be so scared anymore. She tells him his drawings are good and that makes him feel proud.

Jess helps Leslie too. She did not have any friends before she moved. He shows her that she is not alone anymore.

Then Leslie dies and it is very sad. Jess is really upset. But at the end he takes his little sister May Belle to Terabithia. He wants her to be the new queen. I liked this book a lot.`,
    events: [
      {t: 0, type: "session_start", label: "Session started"},
      {t: 180000, type: "keystroke", label: "Typing"},
      {t: 1020000, type: "blur", label: "Left page (33s)"},
      {t: 1053000, type: "focus", label: "Returned"},
      {t: 1620000, type: "keystroke", label: "Typing continued"},
    ],
  },
  {
    id: 8,
    name: "Isaac Johnson",
    email: "ijohnson@mcpsmd.net",
    flag: "yellow",
    reasons: [
      "Typing speed (47 WPM) is above grade norm.",
      "Completed essay in 14 minutes.",
    ],
    wordCount: 301,
    activeMs: 14 * 60 * 1000,
    wpm: 47,
    pastes: 0,
    tabSwitches: 0,
    submittedAt: "Apr 23, 5:12 PM",
    essay: `Bridge to Terabithia is my favorite book I have read for school this year. The friendship between Jess and Leslie is what makes the story so powerful and memorable. They are two very different kids who end up changing each other's lives.

Jess is a quiet boy from a farm family. He loves drawing more than anything else but his dad would rather he help with chores and act more like a boy. He practices running all summer because he wants to be the fastest kid in fifth grade. His plan falls apart on the first day of school when a new girl named Leslie shows up and beats him easily. At first he is upset but Leslie is nice to him and they start talking.

Leslie is from the city and her parents are writers. Her family does not have a TV which the other kids think is strange. Leslie does not care what anyone thinks. She is confident and funny and she loves making up stories. Jess has never met anyone like her.

The two of them invent a secret kingdom in the woods called Terabithia. You get there by swinging on a rope across a creek. In Terabithia they are the king and queen. It is their escape from everything that is hard about their real lives.

Leslie teaches Jess to believe in his art and in himself. She shows him that it is okay to be different. Jess teaches Leslie that she is not alone and that somebody understands her.

When Leslie dies crossing the creek it breaks Jess's heart. But he carries Terabithia forward by bringing his sister May Belle there. Their friendship never really ended.`,
    events: [
      {t: 0, type: "session_start", label: "Session started"},
      {t: 45000, type: "keystroke", label: "Typing (fast pace)"},
      {t: 360000, type: "pause", label: "Paused 12s"},
      {t: 372000, type: "keystroke", label: "Typing resumed"},
      {t: 720000, type: "keystroke", label: "Continued typing"},
      {t: 840000, type: "submit", label: "Submitted"},
    ],
  },
  {
    id: 9,
    name: "Jayden Kim",
    email: "jkim@mcpsmd.net",
    flag: "green",
    reasons: [],
    wordCount: 276,
    activeMs: 35 * 60 * 1000,
    wpm: 9,
    pastes: 0,
    tabSwitches: 2,
    submittedAt: "Apr 23, 7:05 PM",
    essay: `Bridge to Terabithia is a book about friendship and how one person can really change your life. Jess and Leslie are very different but they become best friends.

Jess is a kid who likes to be alone. He lives on a farm with his family and they do not really get him. He loves to draw but he hides it from his dad. He thinks if he can be the fastest runner in his class then maybe his dad will be proud of him.

On the first day of school Leslie is there. She is new. Nobody expects her to race but she does and she wins. Jess is upset but he is also interested in Leslie because she is different.

Leslie and Jess become friends really fast. They go into the woods behind their houses and make up a place called Terabithia. Terabithia is a magical land and they are the king and queen. It is the best part of their day to go there.

Leslie teaches Jess how to use his imagination. She also tells him his drawings are great. This makes Jess happy. Jess teaches Leslie how to get around in the country and he is also her first real friend.

One day Leslie dies. She was trying to go to Terabithia by herself. The rope she used to swing over the creek broke. Jess is really sad. He does not want to believe it.

At the end Jess decides to keep Terabithia alive. He takes his sister May Belle there and makes her a queen. He wants to remember Leslie by passing on their magic.`,
    events: [
      {t: 0, type: "session_start", label: "Session started"},
      {t: 240000, type: "keystroke", label: "Typing"},
      {t: 1140000, type: "blur", label: "Left page (41s)"},
      {t: 1181000, type: "focus", label: "Returned"},
      {t: 1680000, type: "blur", label: "Left page (18s)"},
      {t: 1698000, type: "focus", label: "Returned"},
    ],
  },
  {
    id: 10,
    name: "Kira Mendoza",
    email: "kmendoza@mcpsmd.net",
    flag: "red",
    reasons: [
      "Typing speed (94 WPM) is unusually fast for grade 5.",
      "No pauses or revisions typical of drafting.",
      "Vocabulary markedly above grade level.",
    ],
    wordCount: 318,
    activeMs: 4 * 60 * 1000 + 12 * 1000,
    wpm: 94,
    pastes: 0,
    tabSwitches: 1,
    submittedAt: "Apr 23, 11:40 PM",
    essay: `Katherine Paterson's Bridge to Terabithia offers a poignant meditation on the transformative power of childhood friendship, depicted through the unlikely bond between Jess Aarons and Leslie Burke. Their relationship transcends the boundaries of gender, class, and temperament that might otherwise have kept them apart, and in doing so it illuminates the ways in which authentic connection can catalyze personal growth.

Jess, the introspective middle child in a struggling rural family, harbors an artistic sensibility that finds little room to breathe in his utilitarian household. His father's pragmatism and his sisters' indifference conspire to make him feel invisible within his own home. Running becomes his quiet ambition, a solitary pursuit he hopes will finally earn him recognition. Leslie's arrival upends these modest aspirations entirely: she not only outpaces him but does so without triumphalism, and her easy confidence unsettles and intrigues him in equal measure.

Leslie, the only child of unconventional intellectuals, brings to their friendship an imaginative expansiveness that reconfigures Jess's sense of what is possible. Their shared invention of Terabithia, a kingdom in the woods accessible only by rope swing, becomes the crucible in which both children are remade. There, Jess discovers a latent courage and creative authority, while Leslie finds, for the first time, a peer who takes her imagination seriously rather than treating it as eccentricity.

Each teaches the other what the other most needs: Leslie offers Jess permission to value his inner life; Jess offers Leslie the grounded companionship she has never known. Leslie's tragic death does not unmake these gifts. Jess's ultimate gesture, initiating his sister May Belle into Terabithia, suggests that the bonds forged in genuine friendship outlive the friend, continuing to shape how we move through the world and whom we choose to bring along.`,
    events: [
      {t: 0, type: "session_start", label: "Session started"},
      {t: 8000, type: "keystroke", label: "Typing (94 WPM)", level: "alert"},
      {t: 60000, type: "keystroke", label: "Still typing at high speed", level: "alert"},
      {t: 120000, type: "blur", label: "Left page (6s)", level: "warn"},
      {t: 126000, type: "focus", label: "Returned"},
      {t: 180000, type: "keystroke", label: "Typing continues (no pauses)", level: "alert"},
      {t: 240000, type: "keystroke", label: "Typing"},
      {t: 252000, type: "submit", label: "Submitted"},
    ],
  },
  {
    id: 11,
    name: "Liam O'Brien",
    email: "lobrien@mcpsmd.net",
    flag: "green",
    reasons: [],
    wordCount: 282,
    activeMs: 31 * 60 * 1000,
    wpm: 10,
    pastes: 0,
    tabSwitches: 1,
    submittedAt: "Apr 22, 8:50 PM",
    essay: `I really liked reading Bridge to Terabithia. The friendship between Jess and Leslie was my favorite part of the book. They did not seem like they would be friends at first but then they became best friends.

Jess is a boy who lives on a farm. He has four sisters and his family does not have much money. He does not get to do a lot of fun things. But he likes drawing even though he does not show anyone. He also likes running and he wants to be the fastest kid in his grade.

Leslie is new. She moves into the old Perkins place next to Jess's farm. Leslie's family is different. They are writers and they do not have a TV. Some kids make fun of Leslie for this. But Leslie is not the kind of person who cares about being made fun of.

After school Jess and Leslie go into the woods. They swing across the creek on a rope and they make a fort. They call the whole woods Terabithia. They are the king and queen. Nobody else knows about it. It feels safe and happy there.

Leslie helps Jess a lot. She tells him his drawings are good and she makes him feel brave. Jess helps Leslie too. He is her friend when she does not have anyone else.

Then a very sad thing happens. Leslie tries to go to Terabithia alone when it is raining and the rope breaks. She falls and dies. Jess is heartbroken. But at the end he takes his sister May Belle to Terabithia. He wants to share what Leslie made with him.`,
    events: [
      {t: 0, type: "session_start", label: "Session started"},
      {t: 200000, type: "keystroke", label: "Typing"},
      {t: 960000, type: "blur", label: "Left page (26s)"},
      {t: 986000, type: "focus", label: "Returned"},
      {t: 1680000, type: "revision", label: "Rewrote paragraph 3"},
    ],
  },
  {
    id: 12,
    name: "Maya Patel",
    email: "mpatel@mcpsmd.net",
    flag: "yellow",
    reasons: [
      "Pasted 3 passages (46, 58, and 22 characters).",
      "Active time of 18 minutes is on the low end.",
    ],
    wordCount: 263,
    activeMs: 18 * 60 * 1000,
    wpm: 15,
    pastes: 3,
    tabSwitches: 2,
    submittedAt: "Apr 23, 9:44 PM",
    essay: `Bridge to Terabithia is a book about two friends, Jess and Leslie. They are both in fifth grade. The book takes place in a small town in Virginia.

Jess is described in the book as "skinny with dirty blond hair." He is kind of quiet and he likes to draw. His family has a farm. He has four sisters. He is the only boy so he has to do a lot of the chores his dad gives him.

Leslie is new and her family bought the old Perkins place. Leslie is different from the other kids. She wears overalls and sneakers instead of dresses. The other kids think she is strange but Jess becomes friends with her after she beats him in a race.

Together they make a place in the woods called Terabithia. You have to swing over the creek on a rope to get there. They call themselves the king and queen. It is their secret kingdom where "they could be who they wanted to be" as the book says.

Leslie teaches Jess to imagine things and to be brave. Jess teaches Leslie about the country because she is from the city. They learn from each other. They make each other better people.

Then Leslie dies one day. She went to Terabithia alone and the rope broke. She fell in the creek and drowned. Jess is really sad. He does not want to go back to Terabithia without her. But then he takes his little sister there. He makes her the new queen of Terabithia.`,
    events: [
      {t: 0, type: "session_start", label: "Session started"},
      {t: 180000, type: "keystroke", label: "Typing"},
      {t: 480000, type: "paste", label: "Pasted quote (46 chars)", level: "warn"},
      {t: 540000, type: "keystroke", label: "Typing resumed"},
      {t: 780000, type: "blur", label: "Left page (35s)"},
      {t: 815000, type: "focus", label: "Returned"},
      {t: 900000, type: "paste", label: "Pasted quote (58 chars)", level: "warn"},
      {t: 1020000, type: "keystroke", label: "Typing"},
      {t: 1080000, type: "paste", label: "Pasted text (22 chars)", level: "warn"},
    ],
  },
];

/* Build snapshots for each submission so the replay player works.
   Green/yellow students: progressive typing snapshots.
   Red students with large paste: paste-pattern snapshots. */
SUBMISSIONS.forEach(sub => {
  if (sub.id === 6) {
    // Felix — big paste then tiny edits
    sub.snapshots = buildPasteSnapshots(
      sub.essay,
      [" ", " ", " ", " ", " ", " ", " ", " "],
      sub.activeMs
    );
  } else {
    sub.snapshots = buildTypingSnapshots(sub.essay, sub.activeMs);
  }
});
