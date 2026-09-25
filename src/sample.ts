import OTH from "./oth.js";

const sample = `
#+AUTHOR: John Smith

* Title
** Subtitle
Quibusdam explicabo qui corrupti facilis. Et ratione beatae officia blanditiis inventore. Beatae
qui magni magnam.

Deleniti fugiat id quia autem eos placeat nulla. Dolor reprehenderit reiciendis voluptatem est
occaecati quia quod quidem. Ullam officia sunt quia.

# Dolorum quam iure amet et nesciunt. Similique eos ullam non ex excepturi quibusdam. Sunt sapiente
# aut nulla quis exercitationem. Est cum distinctio odio aut dolores et hic.

- apples
  - granny smith
    - grandpa smith
  - applejack
  - honey crisp
- oranges
- pears

#+CAPTION: employees
| №  | Name   | Surname |
|----|--------|---------|
| 1  | Carter | Hudson  |
| 2  | Peter  | Rosas   |
|----|--------|---------|
| 15 | Joelle | Hartman |

1. Carter Hudson
2. Peter Rosas
   1. His dog Lucky
15. [@15] Joelle Hartman
`;
const oth = new OTH();
console.dir(oth.parse(sample), { depth: 10 });
