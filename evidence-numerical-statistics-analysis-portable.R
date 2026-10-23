library(haven)

# Portfolio packaging revision, October 2026. Statistical methods unchanged.
# Run: Rscript statistics-analysis-portable.R /path/to/Health_Data.sav
args <- commandArgs(trailingOnly = TRUE)
if (length(args) != 1L) stop("Supply the path to the local .sav dataset")
if (!file.exists(args[1])) stop("Dataset file not found")
data <- read_sav(args[1])

# Convert labelled variables
data$diabetes_group <- as_factor(data$diabetes)
data$occupation_group <- as_factor(data$occupation)

# Mode function
get_mode <- function(x) {
  x <- na.omit(x)
  ux <- unique(x)
  ux[tabulate(match(x, ux)) == max(tabulate(match(x, ux)))]
}

# Age summary
mean(data$age, na.rm = TRUE)
median(data$age, na.rm = TRUE)
get_mode(data$age)

# Median DBP by diabetes status
tapply(data$dbp, data$diabetes_group, median, na.rm = TRUE)

# Wilcoxon rank-sum test
wilcox.test(dbp ~ diabetes_group, data = data, exact = FALSE)

# Mean SBP by occupation group
aggregate(sbp ~ occupation_group, data = data, mean, na.rm = TRUE)

# One-way ANOVA
anova_result <- aov(sbp ~ occupation_group, data = data)
summary(anova_result)