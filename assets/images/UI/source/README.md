# Icon masters

The 1254px originals. `ChalkIcon` draws these at 20–52pt and recolours them
with `tintColor`, so only the shape ever reaches the screen — the shipped
copies one directory up are 256px, which still covers 52pt on a 3x screen
with room to spare, and the thirteen of them weigh 584 KB instead of 13.3 MB.

Nothing imports this directory, so Metro leaves it out of the bundle. Re-export
from here if an icon is ever needed larger.
