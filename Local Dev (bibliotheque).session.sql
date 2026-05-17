SELECT
    b.id,
    b.title,
    b.isbn,
    b.barcode,
    b.owner_id,
    STRING_AGG(a.name, ', ') AS auteurs,
    b.created_at,
    COUNT(*) OVER (PARTITION BY b.title) AS nb_copies
FROM books b
LEFT JOIN book_author_link bal ON bal.book_id = b.id
LEFT JOIN authors a ON a.id = bal.author_id
WHERE b.title IN (
    SELECT title
    FROM books
    GROUP BY title
    HAVING COUNT(*) > 1
)
GROUP BY b.id, b.title, b.isbn, b.barcode, b.created_at
ORDER BY b.title, b.created_at;