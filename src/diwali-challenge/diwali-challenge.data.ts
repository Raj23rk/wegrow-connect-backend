export interface ChallengeQuestion {
  id: number;
  category: 'Logic & Problem Solving' | 'Coding Basics' | 'AI & Machine Learning' | 'Modern Tech & Cloud';
  question: string;
  options: string[];
  correctOption: number; // 0-indexed (0=A, 1=B, 2=C, 3=D)
  marks: number;
  explanation: string;
}

export const DIWALI_CHALLENGE_QUESTIONS: ChallengeQuestion[] = [
  // ==========================================
  // SECTION 1: LOGIC & PROBLEM SOLVING (Q1 - Q5)
  // ==========================================
  {
    id: 1,
    category: 'Logic & Problem Solving',
    question: 'If you have an unsorted list of 1,000 numbers, what is the best algorithm to find a specific number in the worst case if you sort it first?',
    options: [
      'Linear Search - O(N)',
      'Binary Search - O(log N)',
      'Bubble Search - O(N²)',
      'Exponential Search - O(N!)',
    ],
    correctOption: 1,
    marks: 5,
    explanation: 'Once an array is sorted, Binary Search divides the search space in half at each step, operating in O(log N) time.',
  },
  {
    id: 2,
    category: 'Logic & Problem Solving',
    question: 'A server receives 2 requests in the 1st minute, 4 in the 2nd, 8 in the 3rd, and doubles every minute. In which minute will it exceed 1,000 requests?',
    options: [
      '8th minute',
      '9th minute',
      '10th minute',
      '12th minute',
    ],
    correctOption: 2,
    marks: 5,
    explanation: '2^9 = 512, and 2^10 = 1024 requests, which occurs in the 10th minute.',
  },
  {
    id: 3,
    category: 'Logic & Problem Solving',
    question: 'Which data structure follows the Last-In, First-Out (LIFO) principle, such as browser "Back" history or function call stacks?',
    options: [
      'Queue',
      'Stack',
      'Hash Map',
      'Linked List',
    ],
    correctOption: 1,
    marks: 5,
    explanation: 'A Stack stores items in LIFO order where the last item pushed is the first to be popped.',
  },
  {
    id: 4,
    category: 'Logic & Problem Solving',
    question: 'You want to quickly look up a student’s record using their unique Student ID in average O(1) constant time. Which data structure should you use?',
    options: [
      'Hash Table (Dictionary / Object)',
      'Array / List',
      'Binary Search Tree',
      'Queue',
    ],
    correctOption: 0,
    marks: 5,
    explanation: 'Hash Tables (dictionaries) provide direct key-based lookups in average O(1) constant time.',
  },
  {
    id: 5,
    category: 'Logic & Problem Solving',
    question: 'What is the minimum number of binary bits needed to represent the decimal number 100?',
    options: [
      '5 bits',
      '6 bits',
      '7 bits',
      '8 bits',
    ],
    correctOption: 2,
    marks: 5,
    explanation: '2^6 = 64 (too small), while 2^7 = 128 (can hold 0-127). Hence 7 bits are required (100 in binary is 1100100).',
  },

  // ==========================================
  // SECTION 2: CODING BASICS (Q6 - Q10)
  // ==========================================
  {
    id: 6,
    category: 'Coding Basics',
    question: 'In Python, what is the output of: print(type([1, 2, "WeGrow"]))?',
    options: [
      '<class "tuple">',
      '<class "list">',
      '<class "set">',
      '<class "dict">',
    ],
    correctOption: 1,
    marks: 5,
    explanation: 'Square brackets [ ] define a mutable list in Python.',
  },
  {
    id: 7,
    category: 'Coding Basics',
    question: 'In JavaScript / TypeScript, what does the triple equals operator (===) check that double equals (==) does NOT?',
    options: [
      'Memory address only',
      'Both value and data type without type coercion',
      'Length of the string or array',
      'Whether the variable is null',
    ],
    correctOption: 1,
    marks: 5,
    explanation: 'Strict equality (===) checks both value and type without performing implicit type conversion.',
  },
  {
    id: 8,
    category: 'Coding Basics',
    question: 'What will be the output of 10 % 3 in most programming languages (Python, JavaScript, Java)?',
    options: [
      '3',
      '3.33',
      '1',
      '0',
    ],
    correctOption: 2,
    marks: 5,
    explanation: 'The modulo operator (%) returns the remainder of the division: 10 divided by 3 is 3 with a remainder of 1.',
  },
  {
    id: 9,
    category: 'Coding Basics',
    question: 'Which keyword is used in modern asynchronous JavaScript / Python to pause execution until a Promise or Coroutine completes?',
    options: [
      'defer',
      'wait_until',
      'await',
      'pause',
    ],
    correctOption: 2,
    marks: 5,
    explanation: 'The "await" keyword pauses the async function until the promise is resolved.',
  },
  {
    id: 10,
    category: 'Coding Basics',
    question: 'Which of the following is an immutable data structure in Python (cannot be modified after creation)?',
    options: [
      'List: [1, 2, 3]',
      'Dictionary: {"name": "Raj"}',
      'Set: {1, 2, 3}',
      'Tuple: (1, 2, 3)',
    ],
    correctOption: 3,
    marks: 5,
    explanation: 'Tuples are immutable sequences in Python; their elements cannot be changed after creation.',
  },

  // ==========================================
  // SECTION 3: AI & MACHINE LEARNING (Q11 - Q15)
  // ==========================================
  {
    id: 11,
    category: 'AI & Machine Learning',
    question: 'What does the "T" stand for in "GPT" (Generative Pre-trained Transformer)?',
    options: [
      'Translator',
      'Transformer',
      'Token',
      'Tensor',
    ],
    correctOption: 1,
    marks: 5,
    explanation: 'GPT stands for Generative Pre-trained Transformer, based on the self-attention Transformer neural architecture.',
  },
  {
    id: 12,
    category: 'AI & Machine Learning',
    question: 'In Machine Learning, what type of learning is used when models are trained on data with explicit input-output labels?',
    options: [
      'Supervised Learning',
      'Unsupervised Learning',
      'Reinforcement Learning',
      'Self-Taught Clustering',
    ],
    correctOption: 0,
    marks: 5,
    explanation: 'Supervised learning uses labeled pairs (features and target labels) to train models.',
  },
  {
    id: 13,
    category: 'AI & Machine Learning',
    question: 'What is a "Token" in Large Language Models (LLMs)?',
    options: [
      'A physical security key',
      'A chunk of characters or word parts that the AI model processes',
      'A cryptocurrency coin used for GPU server fees',
      'The final accuracy score of the neural network',
    ],
    correctOption: 1,
    marks: 5,
    explanation: 'In NLP and LLMs, text is split into tokens (sub-words or characters) which the neural network encodes as numbers.',
  },
  {
    id: 14,
    category: 'AI & Machine Learning',
    question: 'When an AI model generates confident-sounding information that is factually false or fabricated, this phenomenon is called:',
    options: [
      'Overfitting',
      'Underfitting',
      'Hallucination',
      'Gradient Descent',
    ],
    correctOption: 2,
    marks: 5,
    explanation: 'AI Hallucination refers to generative AI models producing fabricated or incorrect statements with high confidence.',
  },
  {
    id: 15,
    category: 'AI & Machine Learning',
    question: 'Which technique is used to connect an LLM to external campus databases or private documents to provide accurate, grounded answers?',
    options: [
      'RAG (Retrieval-Augmented Generation)',
      'Dropout Regularization',
      'Data Quantization',
      'Backpropagation',
    ],
    correctOption: 0,
    marks: 5,
    explanation: 'RAG retrieves relevant facts from a knowledge base and feeds them into the model prompt to ensure up-to-date and accurate output.',
  },

  // ==========================================
  // SECTION 4: MODERN TECH, CLOUD & WEB (Q16 - Q20)
  // ==========================================
  {
    id: 16,
    category: 'Modern Tech & Cloud',
    question: 'What does "API" stand for in software engineering?',
    options: [
      'Automated Program Integration',
      'Application Programming Interface',
      'Advanced Python Interpreter',
      'Applied Protocol Identifier',
    ],
    correctOption: 1,
    marks: 5,
    explanation: 'API stands for Application Programming Interface, which allows two different software programs to communicate.',
  },
  {
    id: 17,
    category: 'Modern Tech & Cloud',
    question: 'Which HTTP status code signifies that a client request succeeded and the requested resource was returned?',
    options: [
      '200 OK',
      '404 Not Found',
      '500 Internal Server Error',
      '301 Moved Permanently',
    ],
    correctOption: 0,
    marks: 5,
    explanation: '200 OK is the standard HTTP response status code for successful requests.',
  },
  {
    id: 18,
    category: 'Modern Tech & Cloud',
    question: 'What is Git primarily used for in software development teams?',
    options: [
      'Designing user interfaces',
      'Hosting live video conferences',
      'Distributed version control and tracking code history',
      'Compiling binary assembly files',
    ],
    correctOption: 2,
    marks: 5,
    explanation: 'Git is a distributed version control system used to track code revisions and collaborate across teams.',
  },
  {
    id: 19,
    category: 'Modern Tech & Cloud',
    question: 'In database management, what does ACID stand for to guarantee reliable transactions?',
    options: [
      'Accuracy, Consistency, Indexing, Delivery',
      'Atomicity, Consistency, Isolation, Durability',
      'Asynchronous, Cached, Indexed, Distributed',
      'Array, Collection, Interface, Document',
    ],
    correctOption: 1,
    marks: 5,
    explanation: 'ACID properties (Atomicity, Consistency, Isolation, Durability) ensure database transactions are processed reliably.',
  },
  {
    id: 20,
    category: 'Modern Tech & Cloud',
    question: 'Which cloud computing model provides virtualized computing resources over the internet, such as AWS EC2 or Google Compute Engine?',
    options: [
      'SaaS (Software as a Service)',
      'PaaS (Platform as a Service)',
      'IaaS (Infrastructure as a Service)',
      'BaaS (Backend as a Service)',
    ],
    correctOption: 2,
    marks: 5,
    explanation: 'IaaS provides raw infrastructure like virtual machines, storage, and networking over the cloud.',
  },
];
