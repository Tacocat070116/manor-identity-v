"""Copy the review board only; both frames use the production app."""
from pathlib import Path
root=Path(__file__).resolve().parents[2]
(root/'dist/__search-review.html').write_text((root/'design/home-search/review.html').read_text())
print('Review board: /__search-review.html')
