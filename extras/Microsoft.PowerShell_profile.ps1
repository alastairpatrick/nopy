# Put this file in $PROFILE so it runs automatically when Windows PowerShell starts.

function npmrun()
{
  $command, $rest = $args
  npm --silent --color false run "$command" -- $rest
}

function nopy()
{
  npmrun nopy $args
}

function npip()
{
  npmrun npip $args
}

# Add a signature below if the execution policy requires it.